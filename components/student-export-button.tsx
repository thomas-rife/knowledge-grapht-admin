"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, List, ListItemButton,
  ListItemIcon, ListItemText, Snackbar, TextField, Typography,
} from "@mui/material";
import { Download } from "@mui/icons-material";
import type { ExportStudent } from "@/lib/student-export/types";

export default function StudentExportButton({ studentId }: { studentId?: string }) {
  const { className } = useParams<{ className: string }>();
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<ExportStudent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setStudents([]);
    setSelected(new Set());
    setSearch("");
    setError(null);
    (async () => {
      try {
        const response = await fetch(`/api/student-export?${new URLSearchParams({ className })}`, {
          signal: controller.signal, cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load students.");
        const roster = (result.students as ExportStudent[])
          .filter((student) => !studentId || student.student_id === studentId)
          .sort((a, b) => (a.display_name || a.email || a.student_id)
            .localeCompare(b.display_name || b.email || b.student_id));
        if (controller.signal.aborted) return;
        setStudents(roster);
        setSelected(new Set(roster.map((student) => student.student_id)));
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load students.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [open, className, studentId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => [student.display_name, student.email, student.student_id]
      .some((value) => value.toLowerCase().includes(term)));
  }, [students, search]);
  const visibleSelected = visible.filter((student) => selected.has(student.student_id)).length;
  const toggleStudent = (id: string) => setSelected((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleVisible = () => setSelected((previous) => {
    const next = new Set(previous);
    const allSelected = visible.every((student) => next.has(student.student_id));
    visible.forEach((student) => { if (allSelected) next.delete(student.student_id); else next.add(student.student_id); });
    return next;
  });

  const download = async () => {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch("/api/student-export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ className, studentIds: Array.from(selected) }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not export student activity.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]
        ?? "student-activity.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpen(false);
      setDownloaded(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not export student activity.");
    } finally { setExporting(false); }
  };

  return (
    <>
      <Button variant="outlined" startIcon={<Download />} onClick={() => setOpen(true)}>
        Export activity
      </Button>
      <Dialog open={open} onClose={() => { if (!exporting) setOpen(false); }}
        fullWidth maxWidth="sm" disableEscapeKeyDown={exporting} aria-labelledby="student-export-title">
        <DialogTitle id="student-export-title">Export student activity</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Download an Excel workbook with students, question answers and their topics, lesson topics,
            and quiz sessions with selected review topics. Includes all recorded activity in this class.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {loading ? (
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", py: 3 }}>
              <CircularProgress size={22} /><Typography>Loading students…</Typography>
            </Box>
          ) : students.length ? (
            <>
              {!studentId && (
                <>
                  <TextField fullWidth size="small" label="Search by name, email, or student ID"
                    value={search} onChange={(event) => setSearch(event.target.value)} disabled={exporting} />
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                    <FormControlLabel label={search.trim() ? `Select all ${visible.length} shown` : "Select all students"}
                      control={<Checkbox checked={visible.length > 0 && visibleSelected === visible.length}
                        indeterminate={visibleSelected > 0 && visibleSelected < visible.length}
                        onChange={toggleVisible} disabled={exporting || !visible.length} />} />
                    <Button size="small" onClick={() => setSelected(new Set())} disabled={exporting || !selected.size}>
                      Clear selection
                    </Button>
                  </Box>
                </>
              )}
              <List dense sx={{ maxHeight: 300, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
                {visible.map((student) => (
                  <ListItemButton key={student.student_id} role="checkbox" aria-checked={selected.has(student.student_id)}
                    aria-label={`${student.display_name || student.student_id}, ${student.email || "No email"}`}
                    disabled={exporting} onClick={() => toggleStudent(student.student_id)}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox checked={selected.has(student.student_id)} tabIndex={-1} disableRipple
                        inputProps={{ "aria-hidden": true }} />
                    </ListItemIcon>
                    <ListItemText primary={student.display_name || student.student_id}
                      secondary={student.email || "No email recorded"} />
                  </ListItemButton>
                ))}
                {!visible.length && <Typography sx={{ p: 2 }} color="text.secondary">No matching students.</Typography>}
              </List>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {selected.size} of {students.length} students selected
              </Typography>
            </>
          ) : !error && <Typography>No enrolled students to export.</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={exporting}>Cancel</Button>
          <Button variant="contained" onClick={download} disabled={loading || exporting || !selected.size}
            startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <Download />}>
            {exporting ? "Preparing export…" : "Download Excel"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={downloaded} autoHideDuration={5000} onClose={() => setDownloaded(false)} message="Student activity export downloaded." />
    </>
  );
}
