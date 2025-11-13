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
  localMarket: string
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

    // Filter items by local market
    const filteredItems = allItems.filter((item) => 
      item.id.startsWith(`${localMarket}-`)
    );

    // Group items by base ID (removing aggregator prefix)
    const groupedItems = new Map<string, ContentItem[]>();
    
    filteredItems.forEach((item) => {
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

    // Transform grouped items
    const transformedItems: any[] = [];
    
    groupedItems.forEach((items, baseId) => {
      // Find primary and secondary items
      const primaryItem = items.find((item) => 
        item.id.startsWith(`${localMarket}-${primaryAggregator.split('-')[1]}-`)
      );
      const secondaryItem = items.find((item) => 
        item.id.startsWith(`${localMarket}-${secondaryAggregator.split('-')[1]}-`)
      );

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
