import type { ContractMode, ContractVisibility } from "./contract.types";

export function getContractVisibility(mode: ContractMode, isViewer: boolean): ContractVisibility {
  const isPro = mode === "pro";

  return {
    suivi: {
      showReserveTab: isPro && !isViewer,
    },
    bilan: {
      showOvertimeKpi: isPro,
      showPayableHoursKpi: isPro,
      showReserveKpi: isPro,
    },
  };
}
