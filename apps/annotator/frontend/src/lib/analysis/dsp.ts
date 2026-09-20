/**
 * ディジタル信号処理 (DSP) 基本数学・数値計算モジュール
 * - 高速 1D FFT (Radix-2 Cooley-Tukey)
 * - 2次 Butterworth 低域通過フィルタ
 * - 線形補間リサンプリング
 * - Burg 法による線形予測分析 (LPC)
 * - Durand-Kerner 法による多項式複素根探索
 */

export function roundDigits(val: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(val * factor) / factor;
}

// 高速 1D FFT (Radix-2 Cooley-Tukey)
export function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if (n <= 1) return;

  let j = 0;
  for (let i = 0; i < n; i++) {
    if (j > i) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;
      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1.0;
      let wI = 0.0;
      for (let k = 0; k < half; k++) {
        const pos = i + k;
        const match = pos + half;
        const uR = real[pos];
        const uI = imag[pos];
        const vR = real[match] * wR - imag[match] * wI;
        const vI = real[match] * wI + imag[match] * wR;

        real[pos] = uR + vR;
        imag[pos] = uI + vI;
        real[match] = uR - vR;
        imag[match] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        wI = wR * wStepI + wI * wStepR;
        wR = nextWR;
      }
    }
  }
}

// 2次 Butterworth 低域通過フィルタ (アンチエイリアシング)
export function lowpassFilter(data: Float32Array, sr: number, cutoff: number): Float32Array {
  const f = 2 * Math.sin((Math.PI * cutoff) / sr);
  let d1 = 0;
  let d2 = 0;
  const q = 0.707;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    d1 += f * (data[i] - d1 - d2 / q);
    d2 += f * d1;
    out[i] = d2;
  }
  return out;
}

// 高精度線形補間リサンプリング (目標サンプリングレート targetSr = 2 * maxFormantFreq へ厳密変換)
export function resampleLinear(data: Float32Array, oldSr: number, newSr: number): Float32Array {
  if (oldSr === newSr) return data;
  const ratio = oldSr / newSr;
  const newLen = Math.floor(data.length / ratio);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const srcIdx = i * ratio;
    const i0 = Math.floor(srcIdx);
    const frac = srcIdx - i0;
    const s0 = data[i0] || 0;
    const s1 = data[i0 + 1] || 0;
    out[i] = s0 + frac * (s1 - s0);
  }
  return out;
}

// Burg 法による線形予測分析 (Praat の Sound_to_Formant_burg と同等の Maximum Entropy 法)
export function lpcBurg(x: Float32Array, p: number): Float64Array {
  const n = x.length;
  const a = new Float64Array(p + 1);
  a[0] = 1.0;
  const f = new Float64Array(n);
  const b = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    f[i] = x[i];
    b[i] = x[i];
  }
  const aPrev = new Float64Array(p + 1);
  aPrev[0] = 1.0;

  for (let m = 1; m <= p; m++) {
    let num = 0.0;
    let den = 0.0;
    for (let i = m; i < n; i++) {
      num += f[i] * b[i - 1];
      den += f[i] * f[i] + b[i - 1] * b[i - 1];
    }
    if (den <= 1e-12) break;
    const k = (2.0 * num) / den;
    if (Math.abs(k) >= 1.0) break;

    a[m] = -k;
    for (let i = 1; i < m; i++) {
      a[i] = aPrev[i] - k * aPrev[m - i];
    }
    for (let i = 0; i <= m; i++) {
      aPrev[i] = a[i];
    }
    for (let i = n - 1; i >= m; i--) {
      const fOld = f[i];
      const bOld = b[i - 1];
      f[i] = fOld - k * bOld;
      b[i] = bOld - k * fOld;
    }
  }
  return a;
}

// 多項式複素根探索法 (Durand-Kerner法): A(z) = 1 + a1*z^-1 + ... + ap*z^-p = 0
export function findRootsDurandKerner(a: Float64Array): [number, number][] {
  const p = a.length - 1;
  const roots: [number, number][] = [];
  const radius = 0.9;
  for (let i = 0; i < p; i++) {
    const angle = (2 * Math.PI * i) / p + 0.3;
    roots.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }

  function cMul(c1: [number, number], c2: [number, number]): [number, number] {
    return [c1[0] * c2[0] - c1[1] * c2[1], c1[0] * c2[1] + c1[1] * c2[0]];
  }
  function cDiv(c1: [number, number], c2: [number, number]): [number, number] {
    const d = c2[0] * c2[0] + c2[1] * c2[1];
    return [(c1[0] * c2[0] + c1[1] * c2[1]) / d, (c1[1] * c2[0] - c1[0] * c2[1]) / d];
  }
  function cSub(c1: [number, number], c2: [number, number]): [number, number] {
    return [c1[0] - c2[0], c1[1] - c2[1]];
  }
  function evalPoly(z: [number, number]): [number, number] {
    let res: [number, number] = [1.0, 0.0];
    for (let i = 1; i <= p; i++) {
      res = cMul(res, z);
      res[0] += a[i];
    }
    return res;
  }

  for (let iter = 0; iter < 40; iter++) {
    let maxChange = 0;
    for (let i = 0; i < p; i++) {
      const zi = roots[i];
      const pVal = evalPoly(zi);
      let denom: [number, number] = [1.0, 0.0];
      for (let j = 0; j < p; j++) {
        if (i !== j) {
          denom = cMul(denom, cSub(zi, roots[j]));
        }
      }
      const step = cDiv(pVal, denom);
      roots[i] = cSub(zi, step);
      const chg = Math.hypot(step[0], step[1]);
      if (chg > maxChange) maxChange = chg;
    }
    if (maxChange < 1e-6) break;
  }
  return roots;
}
