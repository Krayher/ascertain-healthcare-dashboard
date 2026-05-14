import { useNavigate, useSearchParams } from "react-router-dom";

import { FilterRow } from "@/features/patients/components/FilterRow";
import { Pager } from "@/features/patients/components/Pager";
import { PatientTable } from "@/features/patients/components/PatientTable";
import { PatientTableVirtual } from "@/features/patients/components/PatientTableVirtual";
import { usePatients } from "@/features/patients/api";

const PAGE_SIZE = 20;
const VIRTUALIZATION_THRESHOLD = 50;

type Status = "" | "active" | "follow_up" | "inactive";
type SortField = "last_visit_at" | "name" | "created_at";

export default function PatientListPage() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();

  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const search = params.get("search") ?? "";
  const status = (params.get("status") ?? "") as Status;
  const sort = (params.get("sort") ?? "last_visit_at") as SortField;
  const order = (params.get("order") ?? "desc") as "asc" | "desc";

  const query = usePatients({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
    sort,
    order,
  });

  function update(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === "") merged.delete(k);
      else merged.set(k, v);
    }
    setParams(merged);
  }

  return (
    <div className="px-8 py-7">
      <header className="mb-6">
        <h1 className="font-serif text-4xl leading-none tracking-tight">
          <em className="italic">{query.data?.total ?? "—"}</em> patients.
        </h1>
        <p className="mt-1.5 text-[13.5px] text-fg-muted">
          {status ? `Filtered by ${status.replace("_", " ")}.` : "All statuses."} Sorted by{" "}
          {sort === "last_visit_at" ? "most recent visit" : sort.replace("_", " ")}.
        </p>
      </header>

      <FilterRow
        search={search}
        status={status}
        onChange={({ search, status }) =>
          update({ search, status, page: "1" })
        }
      />

      <div className="overflow-hidden rounded-lg border border-border bg-bg-elev">
        {query.isLoading && (
          <div className="p-8 text-sm text-fg-muted">Loading patients…</div>
        )}
        {query.isError && (
          <div className="p-8 text-sm text-danger">
            Failed to load patients. {(query.error as Error).message}
          </div>
        )}
        {query.data && query.data.items.length === 0 && (
          <div className="p-12 text-center">
            <p className="font-serif text-2xl italic text-fg-muted">
              No patients match these filters.
            </p>
          </div>
        )}
        {query.data && query.data.items.length > 0 && (
          <>
            {query.data.items.length > VIRTUALIZATION_THRESHOLD ? (
              <PatientTableVirtual
                rows={query.data.items}
                onRowClick={(id) => nav(`/patients/${id}`)}
              />
            ) : (
              <PatientTable
                rows={query.data.items}
                onRowClick={(id) => nav(`/patients/${id}`)}
                sort={sort}
                order={order}
                onSortChange={(field) => {
                  const nextOrder =
                    sort === field && order === "desc" ? "asc" : "desc";
                  update({ sort: field, order: nextOrder, page: "1" });
                }}
              />
            )}
            <Pager
              page={query.data.page}
              pageSize={query.data.page_size}
              total={query.data.total}
              totalPages={query.data.total_pages}
              onChange={(p) => update({ page: String(p) })}
            />
          </>
        )}
      </div>
    </div>
  );
}
