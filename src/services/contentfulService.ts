import { createClient } from "contentful-management";

export interface SendOptions {
  schemaJson: string;
  item: any;
  locales?: { primary: string; secondary: string };
  marketCodeUpper?: string;
}

type FieldDescriptor =
  | string
  | {
      to?: string; // target field id; if omitted, use the key name
      composeMedia?: {
        metaField: string; // e.g., "contentUrl"
        pathField: string; // e.g., "contentUrl_dm"
        whenType?: string; // e.g., "image"; if provided, only compose when matches
      };
    };

type Schema = {
  aemModel: string;
  contentfulType: string;
  fields: Record<string, FieldDescriptor>; // supports simple or composed mapping
  ignored?: string[];
};

function buildFields(schema: Schema, item: any, primaryLocale: string, secondaryLocale: string) {
  const result: Record<string, Record<string, any>> = {};

  const ignored = new Set(schema.ignored || []);

  Object.entries(schema.fields).forEach(([key, descriptor]) => {
    if (ignored.has(key)) return;

    // Simple: key (aem) -> value (contentful field id)
    if (typeof descriptor === "string") {
      const cfFieldId = descriptor;
      const primaryValue = item?.[key];
      const secondaryValue = item?.[`${key}_secondary`];
      if (primaryValue === undefined && secondaryValue === undefined) return;
      result[cfFieldId] = {} as any;
      if (primaryValue !== undefined && primaryValue !== null) {
        result[cfFieldId][primaryLocale] = primaryValue;
      }
      if (secondaryValue !== undefined && secondaryValue !== null) {
        result[cfFieldId][secondaryLocale] = secondaryValue;
      }
      return;
    }

    // Descriptor with composeMedia
    const toField: string = (typeof descriptor.to === 'string' && descriptor.to.length)
      ? descriptor.to
      : key;
    if (descriptor.composeMedia) {
      const { metaField, pathField, whenType } = descriptor.composeMedia;

      const compose = (src: any) => {
        if (!src) return undefined;
        const meta = src[metaField] || {};
        const pathVal = src[pathField];

        const rawType = (meta as any)?.type as string | undefined;
        const mimeType = (meta as any)?.mimeType as string | undefined;
        const publishUrl = typeof (meta as any)?._publishUrl === "string" ? (meta as any)._publishUrl : null;
        const dynamicUrl = typeof (meta as any)?._dynamicUrl === "string" ? (meta as any)._dynamicUrl : null;

        // Infer effective type when whenType is provided
        let effectiveType = rawType;
        if (!effectiveType) {
          if (mimeType && mimeType.includes('/')) {
            const main = mimeType.split('/')[0];
            effectiveType = main;
          } else {
            const urlForType =
              (typeof pathVal === "string" && pathVal.length > 0 ? pathVal : null) ||
              publishUrl ||
              dynamicUrl;
            if (urlForType) {
              const lower = urlForType.split('?')[0].toLowerCase();
              if (/\.(png|jpe?g|gif|webp|svg)$/.test(lower)) {
                effectiveType = "image";
              }
            }
          }
        }

        if (whenType && effectiveType && effectiveType !== whenType) return undefined;
        if (whenType && !effectiveType && !pathVal) return undefined;

        const damUrl =
          (typeof pathVal === "string" && pathVal.length > 0 ? pathVal : null);

        // Derive filename and format from either damUrl or dynamic/dynamic-like URL
        const guessName = (u: string | null) => {
          if (!u) return null;
          try {
            const last = u.split('/').pop() || '';
            // strip query if present
            return last.split('?')[0];
          } catch { return null; }
        };
        const guessFormatFromMime = (m: string | null) => {
          if (!m) return null;
          const parts = m.split('/');
          return parts.length === 2 ? parts[1] : null;
        };

        const name = guessName(damUrl || dynamicUrl || publishUrl);
        const finalMimeType = mimeType ?? null;
        const format =
          guessFormatFromMime(finalMimeType) ||
          (name && name.includes('.') ? name.split('.').pop() || null : null);

        // We typically don't have repository path for asset; set to null unless available on meta
        const repoPath = ((meta as any).path as string) || ((meta as any)._path as string) || null as any;

        // If we still have no useful URL and no meta id, skip
        if (!damUrl && !(meta as any)._id) return undefined;

        return {
          id: (meta as any)._id ?? null,
          size: ((meta as any).size as number) ?? null,
          name: ((meta as any).name as string) ?? name ?? null,
          title: ((meta as any).title as string) ?? null,
          type: effectiveType ?? rawType ?? null,
          path: repoPath,
          format: format ?? null,
          mimeType: finalMimeType,
          damUrl,
          publishUrl,
          width: ((meta as any).width as number) ?? null,
          height: ((meta as any).height as number) ?? null,
        };
      };

      const primaryComposed = compose(item);
      const secondaryComposed = compose(
        // build a minimal proxy so descriptor uses *_secondary props
        new Proxy(item, {
          get(target, prop) {
            const p = String(prop);
            if (p === metaField) return target?.[`${metaField}_secondary`];
            if (p === pathField) return target?.[`${pathField}_secondary`];
            return (target as any)[prop as any];
          }
        })
      );

      if (primaryComposed === undefined && secondaryComposed === undefined) return;
      result[toField] = {} as any;
      if (primaryComposed !== undefined) {
        result[toField][primaryLocale] = primaryComposed;
      }
      if (secondaryComposed !== undefined) {
        result[toField][secondaryLocale] = secondaryComposed;
      }
      return;
    }

    // Unknown descriptor shape: ignore
  });

  return result;
}

export async function sendToContentful({ schemaJson, item, locales, marketCodeUpper }: SendOptions): Promise<void> {
  let schema: Schema;
  try {
    schema = JSON.parse(schemaJson || "{}");
  } catch {
    throw new Error("Schema JSON is invalid");
  }

  if (!schema?.contentfulType || !schema?.fields) {
    throw new Error("Schema must include contentfulType and fields");
  }

  const spaceId = import.meta.env.VITE_CONTENTFUL_SPACE_ID as string | undefined;
  const envId = (import.meta.env.VITE_CONTENTFUL_ENVIRONMENT as string | undefined) || "master";
  const token = import.meta.env.VITE_CONTENTFUL_CMA_TOKEN as string | undefined;
  const primaryLocale = locales?.primary || (import.meta.env.VITE_CONTENTFUL_PRIMARY_LOCALE as string | undefined) || "en-US";
  const secondaryLocale = locales?.secondary || (import.meta.env.VITE_CONTENTFUL_SECONDARY_LOCALE as string | undefined) || "en-GB";

  if (!spaceId || !token) {
    throw new Error("Missing Contentful env vars (VITE_CONTENTFUL_SPACE_ID, VITE_CONTENTFUL_CMA_TOKEN)");
  }

  const fields = buildFields(schema, item, primaryLocale, secondaryLocale);

  // Derive entryId from item.id, or from fields.id when it's a string descriptor
  let entryIdSource: any = item?.id;
  const idFieldDesc = (schema.fields as any)?.id as FieldDescriptor | undefined;
  if (!entryIdSource && typeof idFieldDesc === 'string') {
    entryIdSource = item?.[idFieldDesc];
  }
  const entryId = String(entryIdSource || "").trim();
  if (!entryId) {
    throw new Error("Item is missing an id");
  }

  // High-level SDK usage
  const mgmt = createClient({ accessToken: token });
  const space = await mgmt.getSpace(spaceId);
  const env = await space.getEnvironment(envId);

  // Prepare tag link if marketCodeUpper provided
  let tagLink: { sys: { type: 'Link'; linkType: 'Tag'; id: string } } | undefined = undefined;
  if (typeof marketCodeUpper === 'string' && marketCodeUpper.trim()) {
    const tagId = marketCodeUpper.trim().toLowerCase();
    try {
      // Ensure tag exists (create if missing)
      try {
        await (env as any).getTag(tagId);
      } catch {
        try {
          await (env as any).createTag(tagId, marketCodeUpper.trim());
        } catch {}
      }
      tagLink = { sys: { type: 'Link', linkType: 'Tag', id: tagId } };
    } catch {}
  }

  let entry: any | null = null;
  try {
    entry = await env.getEntry(entryId);
  } catch {
    entry = null;
  }

  if (!entry) {
    const payload: any = { fields };
    if (tagLink) {
      payload.metadata = { tags: [tagLink] };
    }
    entry = await env.createEntryWithId(schema.contentfulType, entryId, payload);
  } else {
    const mergedFields = { ...(entry.fields || {}), ...fields } as any;
    entry.fields = mergedFields;
    // Merge tags
    if (tagLink) {
      const existing: any[] = (entry as any).metadata?.tags || [];
      const ids = new Set<string>(existing.map((t: any) => t?.sys?.id).filter(Boolean));
      if (!ids.has(tagLink.sys.id)) {
        (entry as any).metadata = { tags: [...existing, tagLink] };
      }
    }
    entry = await entry.update();
  }

  await entry.publish();
}

export function buildContentfulPayload(
  schemaJson: string,
  item: any,
  locales?: { primary: string; secondary: string },
  marketCodeUpper?: string
) {
  let schema: Schema;
  try {
    schema = JSON.parse(schemaJson || "{}");
  } catch {
    throw new Error("Schema JSON is invalid");
  }

  if (!schema?.contentfulType || !schema?.fields) {
    throw new Error("Schema must include contentfulType and fields");
  }

  const primaryLocale = locales?.primary || (import.meta.env.VITE_CONTENTFUL_PRIMARY_LOCALE as string | undefined) || "en-US";
  const secondaryLocale = locales?.secondary || (import.meta.env.VITE_CONTENTFUL_SECONDARY_LOCALE as string | undefined) || "en-GB";

  const fields = buildFields(schema, item, primaryLocale, secondaryLocale);
  let entryIdSource: any = item?.id;
  const idFieldDesc = (schema.fields as any)?.id as FieldDescriptor | undefined;
  if (!entryIdSource && typeof idFieldDesc === 'string') {
    entryIdSource = item?.[idFieldDesc];
  }
  const entryId = String(entryIdSource || "").trim();

  const tagId = typeof marketCodeUpper === 'string' && marketCodeUpper.trim()
    ? marketCodeUpper.trim().toLowerCase()
    : undefined;

  return {
    contentTypeId: schema.contentfulType,
    entryId,
    locales: { primaryLocale, secondaryLocale },
    fields,
    metadata: tagId
      ? { tags: [{ sys: { type: 'Link', linkType: 'Tag', id: tagId } }] }
      : undefined,
  };
}
