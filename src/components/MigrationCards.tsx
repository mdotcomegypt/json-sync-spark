import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { sendToContentful, buildContentfulPayload } from "@/services/contentfulService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  logMigrationStart,
  markMigrationSuccess,
  markMigrationFailure,
  findMigrationsBySourceIds,
  isMigrated,
} from "@/services/migrationMappingService";

interface MigrationCardsProps {
  output: string;
  schemaJson: string;
  locales?: { primary: string; secondary: string };
}

const MigrationCards = ({ output, schemaJson, locales }: MigrationCardsProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string>("");
  const [migratedMap, setMigratedMap] = useState<Record<string, boolean>>({});
  type DepDetail = { id: string; type?: string | null };
  const [depsMap, setDepsMap] = useState<Record<string, DepDetail[]>>({});

  const marketUpper = useMemo(() => {
    try {
      if (!output) return undefined;
      const parsed = JSON.parse(output);
      const lm = parsed?.meta?.localMarket;
      if (typeof lm === "string" && lm.trim()) return lm.trim().toUpperCase();
      return undefined;
    } catch {
      return undefined;
    }
  }, [output]);

  const items = useMemo(() => {
    if (!output) return [] as any[];
    try {
      const parsed = JSON.parse(output);
      const data = parsed?.data || {};
      const all: any[] = [];
      Object.values<any>(data).forEach((list: any) => {
        if (Array.isArray(list?.items)) {
          all.push(...list.items);
        }
      });
      return all;
    } catch {
      return [] as any[];
    }
  }, [output]);

  // Determine entityType from schema JSON if available
  const entityType = useMemo(() => {
    try {
      const schema = JSON.parse(schemaJson || "{}");
      return schema?.aemModel || schema?.contentfulType || "content";
    } catch {
      return "content";
    }
  }, [schemaJson]);

  // Helper: choose key to track migration status (_id preferred)
  const getKey = (it: any) => String((it && (it._id || it.id)) ?? "");

  // Helper: choose display title id > title > any *id key > fallback to _id
  const getHeaderTitle = (it: any) => {
    if (!it || typeof it !== "object") return "(no id)";
    if (it.id) return String(it.id);
    if (it.title) return String(it.title);
    const keys = Object.keys(it);
    const candidate = keys
      .filter((k) => /id$/i.test(k) && k !== "id" && k !== "_id")
      .find((k) => it[k]);
    if (candidate) return String(it[candidate]);
    if (it._id) return String(it._id);
    return "(no id)";
  };

  // Helper: derive secondary id for the same content (language counterpart)
  const getSecondaryId = (it: any): string | null => {
    if (!it || typeof it !== "object") return null;
    if (typeof it._id_secondary === "string" && it._id_secondary.trim().length > 0) {
      return it._id_secondary.trim();
    }
    return null;
  };

  // Extract referenced content IDs recursively from an item (any nested object with _id)
  // Ignore dependencies where the referenced model/type is an image (images won't be migrated)
  const extractReferenced = (it: any): DepDetail[] => {
    const result = new Map<string, DepDetail>();
    const rootId = it && (it._id || it.id);
    const visit = (node: any, parentKey?: string) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach((child) => visit(child, parentKey));
        return;
      }
      const rawId = (node as any)?._id;
      const idStr = typeof rawId === "string" ? rawId.trim() : "";
      // consider only reasonably valid ids
      if (idStr && idStr.length >= 8) {
        if (!rootId || idStr !== rootId) {
          const type = (node as any)?._model?.title ?? parentKey ?? null;
          const nodeType = (node as any)?.type;
          const isImage = (typeof nodeType === "string" && nodeType.toLowerCase() === "image") ||
            (typeof type === "string" && type.toLowerCase() === "image");
          if (!isImage) {
            if (!result.has(idStr)) result.set(idStr, { id: idStr, type });
          }
        }
      }
      Object.entries(node).forEach(([k, v]) => visit(v, k));
    };
    visit(it, undefined);
    return Array.from(result.values());
  };

  // Fetch migrated status for all items and their referenced dependencies
  useEffect(() => {
    const run = async () => {
      const ids = items.map((it: any) => getKey(it)).filter(Boolean);
      if (!ids.length) {
        setMigratedMap({});
        setDepsMap({});
        return;
      }
      try {
        // Check primary items
        const rowsPrimary = await findMigrationsBySourceIds("aem", ids);
        const migratedSet = new Set<string>();
        ids.forEach((id) => {
          const related = rowsPrimary.filter((r) => r.source_id === id);
          if (isMigrated(related)) migratedSet.add(id);
        });

        // Collect referenced ids across all items
        const allRefIds = new Set<string>();
        const itemRefsMap = new Map<string, DepDetail[]>();
        items.forEach((it: any) => {
          const key = getKey(it);
          if (!key) return;
          const refs = extractReferenced(it);
          itemRefsMap.set(key, refs);
          refs.forEach((d) => allRefIds.add(d.id));
        });

        // Check referenced ids (consider both primary and secondary columns)
        const refIds = Array.from(allRefIds);
        let rowsRefs: any[] = [];
        if (refIds.length) {
          rowsRefs = await findMigrationsBySourceIds("aem", refIds);
        }
        const migratedRefSet = new Set<string>();
        refIds.forEach((rid) => {
          const related = rowsRefs.filter(
            (r) => r.source_id === rid || r.source_id_secondary === rid
          );
          if (isMigrated(related)) migratedRefSet.add(rid);
        });

        // Build maps
        const migMap: Record<string, boolean> = {};
        ids.forEach((id) => {
          migMap[id] = migratedSet.has(id);
        });
        setMigratedMap(migMap);

        const dMap: Record<string, DepDetail[]> = {};
        itemRefsMap.forEach((refs, key) => {
          dMap[key] = refs.filter((d) => !migratedRefSet.has(d.id));
        });
        setDepsMap(dMap);
      } catch (e) {
        // non-blocking: ignore fetch errors in UI
      }
    };
    run();
  }, [items]);

  const handleSend = async (item: any) => {
    let startedId: string | null = null;
    try {
      const sourceId = getKey(item);
      const sourceIdSecondary = getSecondaryId(item) || undefined;
      const alreadyMigrated = migratedMap[sourceId] === true;
      const operation = alreadyMigrated ? "update" : "create";

      // Start log
      const started = await logMigrationStart({
        sourceSystem: "aem",
        sourceId,
        sourceIdSecondary,
        entityType,
        operation,
        targetSystem: "contentful",
        payload: { action: operation, itemId: sourceId, itemIdSecondary: sourceIdSecondary },
      });
      startedId = started.id;

      await sendToContentful({ schemaJson, item, locales, marketCodeUpper: marketUpper });

      // Success log
      await markMigrationSuccess(started.id, { targetId: sourceId });

      // refresh badge for this item
      setMigratedMap((prev) => ({ ...prev, [sourceId]: true }));
      toast({
        title: "Sent",
        description: `Item ${item?.id || "(no id)"} sent to Contentful`,
      });
    } catch (err) {
      // Try to mark failure if we have a started log id in scope
      const msg = err instanceof Error ? err.message : "Unknown error";
      try {
        if (startedId) {
          await markMigrationFailure(startedId, msg);
        }
      } catch {}
      toast({
        title: "Send failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const handlePreview = (item: any) => {
    try {
      const payload = buildContentfulPayload(schemaJson, item, locales, marketUpper);
      setPreview(JSON.stringify(payload, null, 2));
      setOpen(true);
    } catch (err) {
      toast({
        title: "Preview failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="h-full flex flex-col shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Migration Items</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-3">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-center">No transformed items yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {items.map((item, idx) => (
                <div
                  key={item?.id ?? idx}
                  className="border rounded-md p-3 bg-card hover:bg-accent/30"
                >
                  {/* Header: ID + status badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {(() => {
                        const headerId = getHeaderTitle(item);
                        return (
                          <p className="font-medium truncate" title={headerId}>{headerId}</p>
                        );
                      })()}
                    </div>
                    {(() => {
                      const id = getKey(item);
                      const migrated = id ? migratedMap[id] === true : false;
                      return (
                        <Badge
                          variant={migrated ? "outline" : "outline"}
                          className={
                            migrated
                              ? "bg-emerald-500 text-white border-transparent"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {migrated ? "Migrated" : "Not migrated"}
                        </Badge>
                      );
                    })()}
                  </div>

                  {/* Details: key: value (show type for object/array) */}
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    {Object.keys(item || {})
                      .filter((k) => !k.startsWith("_") && k !== "id" && k !== "_id")
                      .slice(0, 8)
                      .map((k) => {
                        const v = (item as any)[k];
                        const hasSecondary = (item as any)[`${k}_secondary`] !== undefined;
                        let display: string;
                        if (Array.isArray(v)) {
                          display = "array";
                        } else if (v !== null && typeof v === "object") {
                          display = "object";
                        } else if (typeof v === "boolean") {
                          display = v ? "true" : "false";
                        } else if (v === null || v === undefined) {
                          display = "null";
                        } else {
                          display = String(v);
                        }
                        return (
                          <div key={k} className="truncate">
                            <span className="font-medium text-foreground">{k}</span>
                            <span className="mx-1">:</span>
                            <span className="text-muted-foreground">{display}{hasSecondary ? " + _secondary" : ""}</span>
                          </div>
                        );
                      })}
                  </div>

                  {/* Dependency alerts or success info */}
                  {(() => {
                    const key = getKey(item);
                    const missing = (depsMap[key] || []).filter((d) => typeof d.id === "string" && d.id.trim().length >= 8);
                    if ((missing?.length ?? 0) > 0) {
                      return (
                        <div className="mt-2 space-y-2">
                          {missing.map((d) => (
                            <Alert key={`${key}-${d.id}`} className="border-amber-300 text-amber-800 bg-amber-50">
                              <AlertDescription className="text-xs">
                                {d.type ? `${d.type}` : "Reference"}: {d.id}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div className="mt-2 text-xs rounded border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-1 inline-block">
                        No dependencies
                      </div>
                    );
                  })()}

                  {/* Divider */}
                  <Separator className="my-3" />

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handlePreview(item)}>Preview</Button>
                    <Button size="sm" onClick={() => handleSend(item)} disabled={(depsMap[getKey(item)]?.length ?? 0) > 0}>
                      Send to Contentful
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payload Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-code-bg text-code-foreground rounded-md p-4 max-h-[60vh] overflow-auto">
            {preview ? (
              <pre className="font-mono text-sm whitespace-pre-wrap break-words">{preview}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">No payload</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MigrationCards;
