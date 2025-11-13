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
  aggregationMethod: 'id' | 'path' = 'id'
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

    if (aggregationMethod === 'id') {
      // Filter items by local market (with null checks)
      filteredItems = allItems.filter((item) => 
        item && item.id && typeof item.id === 'string' && item.id.startsWith(`${localMarket}-`)
      );

      // Group items by base ID (removing aggregator prefix)
      filteredItems.forEach((item) => {
        if (!item.id) return;
        
        // Extract base ID by removing the aggregator prefix
        // e.g., "al-al-10gb-whatisnew" -> "10gb-whatisnew"
        const parts = item.id.split('-');
        if (parts.length >= 3) {
          const baseId = parts.slice(2).join('-');
          
          if (!groupedItems.has(baseId)) {
            groupedItems.set(baseId, []);
          }
          groupedItems.get(baseId)!.push(item);
        }
      });
    } else {
      // Path-based aggregation
      filteredItems = allItems.filter((item) => 
        item && item._path && typeof item._path === 'string' && 
        item._path.includes(`/oneappcms-cf/${localMarket}/`)
      );

      // Group items by base path (removing language part)
      filteredItems.forEach((item) => {
        if (!item._path) return;
        
        // Extract base path by removing the language part
        // e.g., "/content/dam/oneappcms-cf/al/mobile/en/something" -> "mobile/something"
        const pathParts = item._path.split('/');
        const marketIndex = pathParts.indexOf(localMarket);
        
        if (marketIndex >= 0 && pathParts.length > marketIndex + 2) {
          // Skip the language code (next item after market) and keep the rest
          const basePath = pathParts.slice(marketIndex + 2).join('/');
          
          if (!groupedItems.has(basePath)) {
            groupedItems.set(basePath, []);
          }
          groupedItems.get(basePath)!.push(item);
        }
      });
    }

    // Transform grouped items
    const transformedItems: any[] = [];
    
    // Extract language codes from aggregators
    const primaryLang = primaryAggregator.includes('-') 
      ? primaryAggregator.split('-')[1] 
      : primaryAggregator;
    const secondaryLang = secondaryAggregator.includes('-') 
      ? secondaryAggregator.split('-')[1] 
      : secondaryAggregator;
    
    groupedItems.forEach((items, baseKey) => {
      // Find primary and secondary items (with null checks)
      let primaryItem, secondaryItem;
      
      if (aggregationMethod === 'id') {
        primaryItem = items.find((item) => 
          item && item.id && item.id.startsWith(`${localMarket}-${primaryLang}-`)
        );
        secondaryItem = items.find((item) => 
          item && item.id && item.id.startsWith(`${localMarket}-${secondaryLang}-`)
        );
      } else {
        // Path-based matching
        primaryItem = items.find((item) => 
          item && item._path && item._path.includes(`/${localMarket}/mobile/${primaryLang}/`)
        );
        secondaryItem = items.find((item) => 
          item && item._path && item._path.includes(`/${localMarket}/mobile/${secondaryLang}/`)
        );
      }

      if (primaryItem) {
        const merged: any = { ...primaryItem };
        
        // Add secondary properties
        if (secondaryItem) {
          Object.keys(secondaryItem).forEach((key) => {
            if (key !== 'id' && key !== '_id' && key !== '_path' && !key.startsWith('_')) {
              const secondaryKey = `${key}_secondary`;
              merged[secondaryKey] = secondaryItem[key];
            }
          });
        }
        
        transformedItems.push(merged);
      }
    });

    // Reconstruct the output structure
    const result: TransformResult = {
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
