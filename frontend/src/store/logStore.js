import { create } from "zustand";

export const useLogStore = create((set) => ({
  summary: {},
  ips: [],
  protocols: [],
  targetIP: "",
  filters: {
    protocols: { TCP: true, UDP: true, ICMP: true },
    volumes: { lt10kb: true, lt1mb: true, gt100mb: true },
    timeRange: "all",
  },
  setSummary: (summary) => set({ summary }),
  setIPs: (ips) => set({ ips }),
  setProtocols: (protocols) => set({ protocols }),
  setTargetIP: (targetIP) => set({ targetIP }),
  setFilters: (filters) => set({ filters }),
}));
