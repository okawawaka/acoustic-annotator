import { TextGridData, Tier, IntervalEntry, PointEntry } from "@/types";

export function parseTextGridClient(contentStr: string): TextGridData {
  const lines = contentStr.split(/\r?\n/).map((l) => l.trim());
  let idx = 0;

  // Format detection
  const isShortFormat = lines.some((l) => l.includes('"ooTextFile"'));
  
  // Find xmin and xmax
  let minTime = 0.0;
  let maxTime = 0.0;
  
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const l = lines[i];
    if (l.startsWith("xmin =") || l.startsWith("xmin=")) {
      minTime = parseFloat(l.split("=")[1].trim()) || 0.0;
    } else if (l.startsWith("xmax =") || l.startsWith("xmax=")) {
      maxTime = parseFloat(l.split("=")[1].trim()) || 0.0;
    }
  }

  // Short textgrid fallback
  if (isShortFormat && maxTime === 0.0 && lines.length > 5) {
    minTime = parseFloat(lines[3]) || 0.0;
    maxTime = parseFloat(lines[4]) || 0.0;
  }

  const tiers: Tier[] = [];

  // Robust parsing: IntervalTier and TextTier search
  let currentTier: Tier | null = null;
  let inIntervals = false;
  let inPoints = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('class = "IntervalTier"') || line === '"IntervalTier"') {
      if (currentTier) tiers.push(currentTier);
      
      let name = "Tier";
      let tMin = minTime;
      let tMax = maxTime;

      // Search ahead for tier metadata
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].startsWith("name =") || lines[j].startsWith("name=")) {
          name = lines[j].split("=")[1].replace(/"/g, "").trim();
        } else if (lines[j].startsWith('"') && !lines[j].includes("=") && j === i + 1) {
          name = lines[j].replace(/"/g, "").trim();
        }
      }

      currentTier = {
        name,
        tier_type: "interval",
        min_timestamp: tMin,
        max_timestamp: tMax,
        entries: [],
      };
      inIntervals = true;
      inPoints = false;
      continue;
    }

    if (line.includes('class = "TextTier"') || line === '"TextTier"') {
      if (currentTier) tiers.push(currentTier);
      
      let name = "Tier";
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].startsWith("name =") || lines[j].startsWith("name=")) {
          name = lines[j].split("=")[1].replace(/"/g, "").trim();
        } else if (lines[j].startsWith('"') && !lines[j].includes("=") && j === i + 1) {
          name = lines[j].replace(/"/g, "").trim();
        }
      }

      currentTier = {
        name,
        tier_type: "point",
        min_timestamp: minTime,
        max_timestamp: maxTime,
        entries: [],
      };
      inIntervals = false;
      inPoints = true;
      continue;
    }

    // Interval entry parsing
    if (inIntervals && currentTier && currentTier.tier_type === "interval") {
      if (line.startsWith("intervals [") || line.startsWith("intervals:")) {
        let start = 0;
        let end = 0;
        let label = "";

        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const sub = lines[j];
          if (sub.startsWith("xmin =") || sub.startsWith("xmin=")) {
            start = parseFloat(sub.split("=")[1].trim()) || 0;
          } else if (sub.startsWith("xmax =") || sub.startsWith("xmax=")) {
            end = parseFloat(sub.split("=")[1].trim()) || 0;
          } else if (sub.startsWith("text =") || sub.startsWith("text=")) {
            label = sub.substring(sub.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
          }
        }
        if (end > start) {
          (currentTier.entries as IntervalEntry[]).push({ start, end, label });
        }
      }
    }
  }

  if (currentTier) {
    tiers.push(currentTier);
  }

  // Fallback if no tiers found
  if (tiers.length === 0) {
    tiers.push({
      name: "Word",
      tier_type: "interval",
      min_timestamp: minTime,
      max_timestamp: maxTime || 1.0,
      entries: [{ start: minTime, end: maxTime || 1.0, label: "" }],
    });
  }

  return {
    min_timestamp: minTime,
    max_timestamp: maxTime || 1.0,
    tiers,
  };
}

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
