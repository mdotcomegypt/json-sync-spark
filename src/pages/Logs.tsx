import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { listMigrations, type ListFilter, type MigrationRecord, type MigrationStatus } from "@/services/migrationMappingService";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const PAGE_SIZE = 50;

type StatusOption = MigrationStatus | "all";

const statusOptions: { label: string; value: StatusOption }[] = [
  { label: "All statuses", value: "all" },
  { label: "Started", value: "started" },
  { label: "Succeeded", value: "succeeded" },
  { label: "Failed", value: "failed" },
  { label: "Updated", value: "updated" },
];

const Logs = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusOption>("all");

  const filter: ListFilter = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status === "all" ? undefined : status,
    }),
    [search, status],
  );

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ["migration-logs", filter],
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam as number;
      const { rows, count } = await listMigrations(filter, PAGE_SIZE, offset);
      return { rows, count, offset };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((acc, page) => acc + page.rows.length, 0);
      if (lastPage.rows.length < PAGE_SIZE) return undefined;
      if (lastPage.count !== undefined && totalLoaded >= lastPage.count) return undefined;
      return totalLoaded;
    },
    keepPreviousData: true,
  });

  const allRows: MigrationRecord[] = useMemo(
    () => data?.pages.flatMap((p) => p.rows) ?? [],
    [data],
  );

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      if (!hasNextPage || isFetchingNextPage) return;
      if (scrollTop + clientHeight >= scrollHeight - 64) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Migration Logs</h1>
            <p className="text-sm text-muted-foreground">
              View and search all migration attempts, sorted by most recently updated.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search by source/target id, entity, operation, status, trace id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as StatusOption)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 rounded-lg border bg-card">
          <ScrollArea className="h-[70vh]" onScroll={handleScroll}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Source</TableHead>
                  <TableHead className="w-[220px]">Target</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px]">Started</TableHead>
                  <TableHead className="w-[200px]">Finished</TableHead>
                  <TableHead className="w-[140px] text-right">Duration (ms)</TableHead>
                  <TableHead className="w-[220px]">Trace ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !allRows.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading && allRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      No migration logs found.
                    </TableCell>
                  </TableRow>
                ) : null}

                {allRows.map((row) => (
                  <TableRow key={row.id} className="align-top">
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium">{row.source_system}</span>
                        <span className="truncate text-muted-foreground">{row.source_id}</span>
                        {row.source_id_secondary ? (
                          <span className="truncate text-muted-foreground">{row.source_id_secondary}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium">{row.target_system ?? "-"}</span>
                        <span className="truncate text-muted-foreground">{row.target_id ?? "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium">{row.entity_type}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{row.operation}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "succeeded"
                            ? "default"
                            : row.status === "failed"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {row.started_at ? format(new Date(row.started_at), "yyyy-MM-dd HH:mm:ss") : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {row.finished_at ? format(new Date(row.finished_at), "yyyy-MM-dd HH:mm:ss") : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs tabular-nums">{row.duration_ms ?? "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground truncate">{row.trace_id ?? "-"}</span>
                    </TableCell>
                  </TableRow>
                ))}

                {isFetchingNextPage ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-4 text-center text-xs text-muted-foreground">
                      Loading more...
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default Logs;
