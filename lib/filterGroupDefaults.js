export const DEFAULT_OPEN_FILTER_GROUPS = 3;
export const VISIBLE_FILTER_GROUP_LIMIT = 15;

export function getSortedFilterGroups(groups, options = {}) {
  const { subSlug, customOrder } = options;
  const list = Object.values(groups || {});

  if (subSlug?.includes("washing-machine")) {
    const priority = ["operation", "washer capacity"];
    return [...list].sort((a, b) => {
      const aIdx = priority.indexOf(a.name.toLowerCase());
      const bIdx = priority.indexOf(b.name.toLowerCase());
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  if (customOrder?.length) {
    const order = customOrder.map((item) => item.toLowerCase());
    return [...list].sort((a, b) => {
      const indexA = order.indexOf(a.name.toLowerCase());
      const indexB = order.indexOf(b.name.toLowerCase());
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      if (a.name.toLowerCase() === "capacity") return -1;
      if (b.name.toLowerCase() === "capacity") return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return [...list].sort((a, b) => {
    if (a.name.toLowerCase() === "capacity") return -1;
    if (b.name.toLowerCase() === "capacity") return 1;
    return a.name.toLowerCase().localeCompare(b.name);
  });
}

export function buildInitialExpandedFilters(groups, options = {}) {
  const openCount = options.openCount ?? DEFAULT_OPEN_FILTER_GROUPS;
  const sortedGroups = getSortedFilterGroups(groups, options);
  const initialExpanded = {};

  sortedGroups.forEach((group, index) => {
    initialExpanded[group._id] = index < openCount;
  });

  return initialExpanded;
}

export function getVisibleFilterGroups(
  sortedGroups,
  showAll = false,
  limit = VISIBLE_FILTER_GROUP_LIMIT
) {
  if (showAll) return sortedGroups;
  return sortedGroups.slice(0, limit);
}
