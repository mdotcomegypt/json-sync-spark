interface ContentItem {
  id: string;
  [key: string]: any;
}

interface TransformResult {
  data: {
    [key: string]: {
      items: any[];
    };
  };
}

export const transformJson = (
  sourceJson: string,
  primaryAggregator: string,
  secondaryAggregator: string,
  localMarket: string,
  aggregationMethod: 'id' | 'path' = 'id',
  aggregationProperty: string = 'id',
  sourcePathPattern?: string,
  translationPathPattern?: string
): string => {
  try {
    const parsed = JSON.parse(sourceJson);
    
    // Extract all items from the source
    const allItems: ContentItem[] = [];
    const data = parsed.data || {};
    
    // Collect all items from all lists
    Object.values(data).forEach((list: any) => {
      if (list.items && Array.isArray(list.items)) {
        allItems.push(...list.items);
      }
    });

    // Filter and group items based on aggregation method
    let filteredItems: ContentItem[] = [];
    const groupedItems = new Map<string, ContentItem[]>();

    // Helper to convert simple wildcard patterns with a single * into a regex with capture group
    const toRegex = (pattern: string) => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const withGroup = escaped.replace(/\\\*/g, "(.+?)");
      return new RegExp(`^${withGroup}$`);
    };

    if (aggregationMethod === 'id') {
      // Filter items by local market (with null checks)
      filteredItems = allItems.filter((item) => 
        item && item[aggregationProperty] && typeof item[aggregationProperty] === 'string' && 
        item[aggregationProperty].startsWith(`${localMarket}-`)
      );

      // Group items by base ID (removing aggregator prefix)
      filteredItems.forEach((item) => {
        const propValue = item[aggregationProperty];
        if (!propValue) return;
        
        // Extract base ID by removing the aggregator prefix
        // e.g., "al-al-10gb-whatisnew" -> "10gb-whatisnew"
        const parts = propValue.split('-');
        if (parts.length >= 3) {
          const baseId = parts.slice(2).join('-');
          
          if (!groupedItems.has(baseId)) {
            groupedItems.set(baseId, []);
          }
          groupedItems.get(baseId)!.push(item);
        }
      });
    } else {
      filteredItems = allItems.filter((item) => 
        item && item._path && typeof item._path === 'string' && 
        item._path.includes(`/${localMarket}/`)
      );

      if (sourcePathPattern && translationPathPattern) {
        const srcRe = toRegex(sourcePathPattern);
        const trRe = toRegex(translationPathPattern);
        const primaryMap = new Map<string, any>();
        const secondaryMap = new Map<string, any>();

        filteredItems.forEach((item) => {
          const p = item._path as string;
          const m1 = srcRe.exec(p);
          if (m1 && m1[1]) primaryMap.set(m1[1], item);
          const m2 = trRe.exec(p);
          if (m2 && m2[1]) secondaryMap.set(m2[1], item);
        });

        primaryMap.forEach((pItem, key) => {
          if (!groupedItems.has(key)) groupedItems.set(key, []);
          groupedItems.get(key)!.push(pItem);
          const sItem = secondaryMap.get(key);
          if (sItem && sItem !== pItem) groupedItems.get(key)!.push(sItem);
        });

        secondaryMap.forEach((sItem, key) => {
          if (!primaryMap.has(key)) {
            if (!groupedItems.has(key)) groupedItems.set(key, []);
            groupedItems.get(key)!.push(sItem);
          }
        });
      } else {
        filteredItems.forEach((item) => {
          if (!item._path) return;
          const parts = (item._path as string).split('/');
          const marketIndex = parts.indexOf(localMarket);
          if (marketIndex >= 0 && parts.length > marketIndex + 2) {
            const basePath = parts.slice(marketIndex + 2).join('/');
            if (!groupedItems.has(basePath)) groupedItems.set(basePath, []);
            groupedItems.get(basePath)!.push(item);
          }
        });
      }
    }

    // Transform grouped items
    const transformedItems: any[] = [];
    
    const primaryLang = primaryAggregator.includes('-') 
      ? primaryAggregator.split('-')[1] 
      : primaryAggregator;
    const secondaryLang = secondaryAggregator.includes('-') 
      ? secondaryAggregator.split('-')[1] 
      : secondaryAggregator;
    
    const nonMatchedPaths = new Set<string>();
    groupedItems.forEach((items, baseKey) => {
      // Find primary and secondary items (with null checks)
      let primaryItem, secondaryItem;
      
      if (aggregationMethod === 'id') {
        primaryItem = items.find((item) => 
          item && item[aggregationProperty] && item[aggregationProperty].startsWith(`${localMarket}-${primaryLang}-`)
        );
        secondaryItem = items.find((item) => 
          item && item[aggregationProperty] && item[aggregationProperty].startsWith(`${localMarket}-${secondaryLang}-`)
        );
      } else {
        if (sourcePathPattern && translationPathPattern) {
          const srcRe = toRegex(sourcePathPattern);
          const trRe = toRegex(translationPathPattern);
          primaryItem = items.find((item) => item && item._path && srcRe.test(item._path));
          secondaryItem = items.find((item) => item && item._path && trRe.test(item._path));
        } else {
          primaryItem = items.find((item) => 
            item && item._path && (item._path as string).includes(`/${localMarket}/`) && (item._path as string).includes(`/${primaryLang}/`)
          );
          secondaryItem = items.find((item) => 
            item && item._path && (item._path as string).includes(`/${localMarket}/`) && (item._path as string).includes(`/${secondaryLang}/`)
          );
        }
      }

      if (primaryItem && secondaryItem) {
        const merged: any = { ...primaryItem };
        
        // Add secondary properties
        Object.keys(secondaryItem).forEach((key) => {
          if (key !== aggregationProperty && key !== '_id' && key !== '_path' && !key.startsWith('_')) {
            const secondaryKey = `${key}_secondary`;
            merged[secondaryKey] = secondaryItem[key];
          }
        });
        // Compose backgroundImage from contentUrl + contentUrl_dm when image
        const composeBg = (it: any) => {
          try {
            const cu = it?.contentUrl;
            const dm = it?.contentUrl_dm;
            if (cu && cu.type === 'image') {
              const path = typeof dm === 'string' && dm.length > 0
                ? dm
                : (typeof cu._dynamicUrl === 'string' ? cu._dynamicUrl : null);
              return {
                path,
                mimeType: cu.mimeType ?? null,
                type: cu.type ?? null,
              };
            }
          } catch {}
          return null;
        };

        const bgPrimary = composeBg(primaryItem);
        if (bgPrimary && bgPrimary.path) {
          merged.backgroundImage = bgPrimary;
        }
        const bgSecondary = composeBg(secondaryItem);
        if (bgSecondary && bgSecondary.path) {
          merged.backgroundImage_secondary = bgSecondary;
        }

        transformedItems.push(merged);
      } else {
        // Collect paths for groups not meeting criteria
        items.forEach((it) => {
          const p = (it && (it as any)._path) as string | undefined;
          if (typeof p === "string" && p.length > 0) nonMatchedPaths.add(p);
        });
      }
    });

    // Build meta summary counts
    const totalGroups = groupedItems.size;
    const mergedCount = transformedItems.length;
    const notMatchedCount = Math.max(0, totalGroups - mergedCount);

    // Reconstruct the output structure
    const result: any = {
      meta: {
        aggregationMethod,
        localMarket,
        mergedCount,
        notMatchedCount,
        nonMatchedPaths: Array.from(nonMatchedPaths),
      },
      data: {}
    };

    // Group transformed items back into their original lists
    Object.keys(data).forEach((listKey) => {
      result.data[listKey] = {
        items: transformedItems.filter((item) => {
          // Match items to their original list based on _model path
          const originalList = data[listKey];
          if (originalList?.items?.[0]?._model?._path) {
            return item._model?._path === originalList.items[0]._model._path;
          }
          return true;
        })
      };
    });

    return JSON.stringify(result, null, 2);
  } catch (error) {
    throw new Error(`Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
