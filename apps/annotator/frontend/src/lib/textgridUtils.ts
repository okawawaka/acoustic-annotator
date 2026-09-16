import { TextGridData, Tier, IntervalEntry, PointEntry } from "@/types";

/**
 * TextGridパーサー (クライアントサイド・完全ローカル動作)
 * Praat 標準の Long 形式および Short 形式 ("ooTextFile")、
 * UTF-8 / UTF-16 / Shift-JIS によるファイル読み込みに対応。
 */
export function parseTextGridClient(contentStr: string): TextGridData {
  // UTF-8 / UTF-16 BOM除去および NULLバイト・改行コードの正規化
  let cleaned = contentStr
    .replace(/\0/g, "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const rawLines = cleaned.split("\n");
  const lines: string[] = [];

  for (let l of rawLines) {
    l = l.trim();
    if (l.length > 0) {
      lines.push(l);
    }
  }

  let xmin = 0.0;
  let xmax = 0.0;

  // Short形式の検出
  const isShortFormat = lines.length > 0 && lines[0].replace(/"/g, "").trim() === "ooTextFile";

  if (isShortFormat) {
    xmin = parseFloat(lines[2]) || 0.0;
    xmax = parseFloat(lines[3]) || 0.0;

    const tiers: Tier[] = [];
    let idx = 4;
    while (idx < lines.length && !lines[idx].includes("<exists>")) {
      idx++;
    }
    idx++; // skip <exists>
    const numTiers = parseInt(lines[idx++], 10) || 0;

    for (let t = 0; t < numTiers && idx < lines.length; t++) {
      const typeStr = lines[idx++].replace(/"/g, "").trim();
      const name = lines[idx++].replace(/"/g, "").trim();
      const tMin = parseFloat(lines[idx++]) || xmin;
      const tMax = parseFloat(lines[idx++]) || xmax;
      const numEntries = parseInt(lines[idx++], 10) || 0;

      if (typeStr === "IntervalTier") {
        const entries: IntervalEntry[] = [];
        for (let e = 0; e < numEntries && idx + 2 < lines.length; e++) {
          const start = parseFloat(lines[idx++]) || 0;
          const end = parseFloat(lines[idx++]) || 0;
          const label = lines[idx++].replace(/^"|"$/g, "");
          if (end >= start) {
            entries.push({ start, end, label });
          }
        }
        tiers.push({
          name: name || `Tier_${t + 1}`,
          tier_type: "interval",
          min_timestamp: tMin,
          max_timestamp: tMax,
          entries,
        });
      } else {
        const entries: PointEntry[] = [];
        for (let e = 0; e < numEntries && idx + 1 < lines.length; e++) {
          const time = parseFloat(lines[idx++]) || 0;
          const label = lines[idx++].replace(/^"|"$/g, "");
          entries.push({ time, label });
        }
        tiers.push({
          name: name || `Tier_${t + 1}`,
          tier_type: "point",
          min_timestamp: tMin,
          max_timestamp: tMax,
          entries,
        });
      }
    }

    return {
      min_timestamp: xmin,
      max_timestamp: xmax > 0 ? xmax : (tiers.length > 0 ? Math.max(...tiers.map(t => t.max_timestamp)) : 1.0),
      tiers: tiers.length > 0 ? tiers : [
        {
          name: "Word",
          tier_type: "interval",
          min_timestamp: xmin,
          max_timestamp: xmax > 0 ? xmax : 1.0,
          entries: [{ start: xmin, end: xmax > 0 ? xmax : 1.0, label: "" }],
        }
      ],
    };
  }

  // Normal (Long) 形式の解析
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const line = lines[i];
    if (line.startsWith("xmin")) {
      const parts = line.split("=");
      if (parts.length > 1) xmin = parseFloat(parts[1].trim()) || 0.0;
    } else if (line.startsWith("xmax")) {
      const parts = line.split("=");
      if (parts.length > 1) xmax = parseFloat(parts[1].trim()) || 0.0;
    }
  }

  const tiers: Tier[] = [];
  let currentTier: Tier | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/class\s*=\s*"IntervalTier"/i.test(line)) {
      if (currentTier) tiers.push(currentTier);
      let name = "Tier";
      let tMin = xmin;
      let tMax = xmax;

      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const sub = lines[j];
        if (/name\s*=/i.test(sub)) {
          name = sub.substring(sub.indexOf("=") + 1).replace(/"/g, "").trim();
        } else if (/xmin\s*=/i.test(sub) && !/intervals/i.test(sub)) {
          tMin = parseFloat(sub.substring(sub.indexOf("=") + 1).trim()) || xmin;
        } else if (/xmax\s*=/i.test(sub) && !/intervals/i.test(sub)) {
          tMax = parseFloat(sub.substring(sub.indexOf("=") + 1).trim()) || xmax;
        } else if (/intervals\s*[:\[]/i.test(sub)) {
          break;
        }
      }

      currentTier = {
        name: name || `Tier_${tiers.length + 1}`,
        tier_type: "interval",
        min_timestamp: tMin,
        max_timestamp: tMax,
        entries: [],
      };
      continue;
    }

    if (/class\s*=\s*"TextTier"/i.test(line)) {
      if (currentTier) tiers.push(currentTier);
      let name = "Tier";
      let tMin = xmin;
      let tMax = xmax;

      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const sub = lines[j];
        if (/name\s*=/i.test(sub)) {
          name = sub.substring(sub.indexOf("=") + 1).replace(/"/g, "").trim();
        } else if (/xmin\s*=/i.test(sub) && !/points/i.test(sub)) {
          tMin = parseFloat(sub.substring(sub.indexOf("=") + 1).trim()) || xmin;
        } else if (/xmax\s*=/i.test(sub) && !/points/i.test(sub)) {
          tMax = parseFloat(sub.substring(sub.indexOf("=") + 1).trim()) || xmax;
        } else if (/points\s*[:\[]/i.test(sub)) {
          break;
        }
      }

      currentTier = {
        name: name || `Tier_${tiers.length + 1}`,
        tier_type: "point",
        min_timestamp: tMin,
        max_timestamp: tMax,
        entries: [],
      };
      continue;
    }

    // Interval item
    if (currentTier && currentTier.tier_type === "interval") {
      if (/intervals\s*\[\s*\d+\s*\]/i.test(line)) {
        let start = 0;
        let end = 0;
        let label = "";

        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const sub = lines[j];
          if (/intervals\s*\[\s*\d+\s*\]/i.test(sub) || /item\s*\[/i.test(sub)) break;
          if (/xmin\s*=/i.test(sub)) {
            start = parseFloat(sub.substring(sub.indexOf("=") + 1).trim()) || 0;
          } else if (/xmax\s*=/i.test(sub)) {
            end = parseFloat(sub.substring(sub.indexOf("=") + 1).trim()) || 0;
          } else if (/text\s*=/i.test(sub)) {
            label = sub.substring(sub.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
          }
        }
        if (end >= start) {
          (currentTier.entries as IntervalEntry[]).push({ start, end, label });
        }
      }
    }

    // Point item
    if (currentTier && currentTier.tier_type === "point") {
      if (/points\s*\[\s*\d+\s*\]/i.test(line)) {
        let time = 0;
        let label = "";

        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const sub = lines[j];
          if (/points\s*\[\s*\d+\s*\]/i.test(sub) || /item\s*\[/i.test(sub)) break;
          if (/(?:time|number)\s*=/i.test(sub)) {
            time = parseFloat(sub.substring(sub.indexOf("=") + 1).trim()) || 0;
          } else if (/(?:text|mark)\s*=/i.test(sub)) {
            label = sub.substring(sub.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
          }
        }
        (currentTier.entries as PointEntry[]).push({ time, label });
      }
    }
  }

  if (currentTier) {
    tiers.push(currentTier);
  }

  // xmaxのフォールバック
  if (xmax === 0 && tiers.length > 0) {
    for (const t of tiers) {
      if (t.max_timestamp > xmax) xmax = t.max_timestamp;
    }
  }

  return {
    min_timestamp: xmin,
    max_timestamp: xmax > 0 ? xmax : 1.0,
    tiers: tiers.length > 0 ? tiers : [
      {
        name: "Word",
        tier_type: "interval",
        min_timestamp: xmin,
        max_timestamp: xmax > 0 ? xmax : 1.0,
        entries: [{ start: xmin, end: xmax > 0 ? xmax : 1.0, label: "" }],
      }
    ],
  };
}

/**
 * TextGrid を Praat 標準 Long 形式の文字列にシリアライズして出力
 */
export function exportTextGridClient(data: TextGridData): string {
  const lines: string[] = [];
  lines.push('File type = "ooTextFile"');
  lines.push('Object class = "TextGrid"');
  lines.push("");
  lines.push(`xmin = ${data.min_timestamp.toFixed(6)}`);
  lines.push(`xmax = ${data.max_timestamp.toFixed(6)}`);
  lines.push("tiers? <exists>");
  lines.push(`size = ${data.tiers.length}`);
  lines.push("item []:");

  data.tiers.forEach((tier, tIdx) => {
    lines.push(`    item [${tIdx + 1}]:`);
    lines.push(`        class = "${tier.tier_type === "interval" ? "IntervalTier" : "TextTier"}"`);
    lines.push(`        name = "${tier.name}"`);
    lines.push(`        xmin = ${tier.min_timestamp.toFixed(6)}`);
    lines.push(`        xmax = ${tier.max_timestamp.toFixed(6)}`);

    if (tier.tier_type === "interval") {
      const entries = tier.entries as IntervalEntry[];
      lines.push(`        intervals: size = ${entries.length}`);
      entries.forEach((entry, eIdx) => {
        lines.push(`        intervals [${eIdx + 1}]:`);
        lines.push(`            xmin = ${entry.start.toFixed(6)}`);
        lines.push(`            xmax = ${entry.end.toFixed(6)}`);
        lines.push(`            text = "${entry.label.replace(/"/g, '""')}"`);
      });
    } else {
      const entries = tier.entries as PointEntry[];
      lines.push(`        points: size = ${entries.length}`);
      entries.forEach((pt, pIdx) => {
        lines.push(`        points [${pIdx + 1}]:`);
        lines.push(`            number = ${pt.time.toFixed(6)}`);
        lines.push(`            mark = "${pt.label.replace(/"/g, '""')}"`);
      });
    }
  });

  return lines.join("\n");
}
