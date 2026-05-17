import { useNavigate, useSearchParams } from "react-router-dom";

import { FilterRow, type Filters } from "@/features/patients/components/FilterRow";
import { Pager } from "@/features/patients/components/Pager";
import { PatientCards } from "@/features/patients/components/PatientCards";
import { PatientTable } from "@/features/patients/components/PatientTable";
import { PatientTableVirtual } from "@/features/patients/components/PatientTableVirtual";
import { ViewModeToggle } from "@/features/patients/components/ViewModeToggle";
import { usePatients } from "@/features/patients/api";
import { usePatientViewMode } from "@/features/patients/view-mode";

const PAGE_SIZE = 20;
const VIRTUALIZATION_THRESHOLD = 50;

type Status = "" | "active" | "follow_up" | "inactive";
type SortField = "last_visit" | "name" | "created_at";

export default function PatientListPage() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const viewMode = usePatientViewMode((s) => s.mode);

  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const filters: Filters = {
    search: params.get("search") ?? "",
    status: (params.get("status") ?? "") as Status,
    bloodType: params.get("blood_type") ?? "",
    condition: params.get("condition") ?? "",
    ageMin: params.get("age_min") ?? "",
    ageMax: params.get("age_max") ?? "",
  };
  const sort = (params.get("sort") ?? "last_visit") as SortField;
  const order = (params.get("order") ?? "desc") as "asc" | "desc";

  const query = usePatients({
    page,
    pageSize: PAGE_SIZE,
    search: filters.search || undefined,
    status: filters.status || undefined,
    bloodType: filters.bloodType || undefined,
    condition: filters.condition || undefined,
    ageMin: filters.ageMin ? Number(filters.ageMin) : undefined,
    ageMax: filters.ageMax ? Number(filters.ageMax) : undefined,
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

  function onFiltersChange(next: Filters) {
    update({
      search: next.search,
      status: next.status,
      blood_type: next.bloodType,
      condition: next.condition,
      age_min: next.ageMin,
      age_max: next.ageMax,
      page: "1",
    });
  }

  const items = query.data?.items ?? [];
  const showVirtualTable =
    viewMode === "table" && items.length > VIRTUALIZATION_THRESHOLD;

  return (
    <div className="px-4 py-6 md:px-8 md:py-7">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="font-serif text-2xl leading-tight tracking-tight md:text-4xl md:leading-none">
            <span className="font-semibold">{query.data?.total ?? "—"}</span> patients
          </h1>
          <p className="mt-1.5 text-[13px] text-fg-muted md:text-[13.5px]">
            {filters.status
              ? `Filtered by ${filters.status.replace("_", " ")}.`
              : "All statuses."}{" "}
            Sorted by {sort === "last_visit" ? "most recent visit" : sort.replace("_", " ")}.
          </p>
        </div>
        <ViewModeToggle />
      </header>

      <FilterRow value={filters} onChange={onFiltersChange} />

      <div className="overflow-hidden rounded-lg border border-border bg-bg-elev">
        {query.isLoading && (
          <div className="p-8 text-sm text-fg-muted">Loading patients…</div>
        )}
        {query.isError && (
          <div className="p-8 text-sm text-danger">
            Failed to load patients. {(query.error as Error).message}
          </div>
        )}
        {query.data && items.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-base text-fg-muted">
              No patients match these filters.
            </p>
          </div>
        )}
        {query.data && items.length > 0 && (
          <>
            {viewMode === "cards" ? (
              <PatientCards
                rows={items}
                onRowClick={(id) => nav(`/patients/${id}`)}
              />
            ) : showVirtualTable ? (
              <PatientTableVirtual
                rows={items}
                onRowClick={(id) => nav(`/patients/${id}`)}
              />
            ) : (
              <PatientTable
                rows={items}
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
