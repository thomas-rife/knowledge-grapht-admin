"use client";

import { useEffect, useState } from "react";
import { Box, Button, Chip, Typography } from "@mui/material";
import { splitRearrangeLine } from "@/lib/questions/rearrange";

export default function RearrangePreview({ line, options, disabled = false }: {
  line: string;
  options: string[];
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const parts = splitRearrangeLine(line);
  const optionKey = JSON.stringify(options);
  useEffect(() => setSelected(null), [line, optionKey]);
  if (!parts) return null;
  return (
    <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
      <Typography variant="subtitle2">Student preview</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Drag a choice into the blank, or click a choice to fill it. Click the filled blank to clear it.
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
        <Box component="span">{parts.before}</Box>
        <Box onDragOver={(event) => { if (!disabled) event.preventDefault(); }}
          onDrop={(event) => {
            event.preventDefault();
            if (disabled) return;
            const raw = event.dataTransfer.getData("application/x-question-option");
            if (!/^\d+$/.test(raw)) return;
            const index = Number(raw);
            if (index < options.length && options[index].trim()) setSelected(index);
          }}>
          <Button variant="outlined" disabled={disabled} aria-label="Answer blank"
            onClick={() => setSelected(null)} sx={{ minWidth: 100, fontFamily: "monospace", textTransform: "none", whiteSpace: "pre-wrap", borderStyle: "dashed" }}>
            {selected === null ? "________" : options[selected]}
          </Button>
        </Box>
        <Box component="span">{parts.after}</Box>
      </Box>
      <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
        {options.map((option, index) => option.trim() && (
          <Chip key={index} label={option} clickable disabled={disabled || selected === index}
            draggable={!disabled && selected !== index}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-question-option", String(index));
              event.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => setSelected(index)} sx={{ fontFamily: "monospace", whiteSpace: "pre" }} />
        ))}
      </Box>
    </Box>
  );
}
