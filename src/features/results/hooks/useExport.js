"use client";

import { useCallback, useRef, useState } from "react";
import { submissions } from "@/lib/api";
import { toast } from "@/components/ui";
import { buildExportRows, fileStem, toCsv } from "../logic/exportRows";
import { toApiParams } from "../logic/filters";

const EXPORT_LIMIT = 100;

/**
 * Exports the filtered submission list: fetches every page sequentially (100 per request), builds the file in the browser.
 * Flagged images are never requested or written.
 * @param {{ quiz: any, filters: ReturnType<typeof import("../logic/filters").parseFilters> }} args
 */
export function useExport({ quiz, filters }) {
  const [progress, setProgress] = useState(null); // { done, total, format } | null
  const busy = useRef(false);

  const run = useCallback(
    async (format) => {
      if (busy.current || !quiz) return;
      busy.current = true;
      setProgress({ done: 0, total: 0, format });
      try {
        const all = [];
        let page = 1;
        let pages = 1;
        let total = 0;
        while (page <= pages) {
          const res = await submissions.listQuizSubmissions(quiz._id, { ...toApiParams({ ...filters, page }, EXPORT_LIMIT) });
          all.push(...res.submissions);
          pages = res.pagination?.pages || 1;
          total = res.pagination?.total ?? all.length;
          setProgress({ done: all.length, total, format });
          page += 1;
        }
        if (all.length === 0) {
          toast.error("Nothing to export for these filters.");
          return;
        }
        const { header, rows } = buildExportRows(all, quiz);
        const stem = fileStem(quiz.title);
        const { default: saveAs } = await import("file-saver");
        if (format === "csv") {
          saveAs(new Blob([toCsv(header, rows)], { type: "text/csv;charset=utf-8" }), `${stem}.csv`);
        } else {
          const XLSX = await import("xlsx");
          const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
          const book = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(book, sheet, "Results");
          const out = XLSX.write(book, { type: "array", bookType: "xlsx" });
          saveAs(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${stem}.xlsx`);
        }
        toast.success(`Exported ${all.length} ${all.length === 1 ? "row" : "rows"}.`);
      } catch (e) {
        toast.error(e?.message || "Export failed. Please try again.");
      } finally {
        busy.current = false;
        setProgress(null);
      }
    },
    [quiz, filters],
  );

  return { run, progress };
}
