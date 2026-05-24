import { useMemo } from "react";
import type { UserFeatures } from "../../types/profile";
import { buildContractFeatures } from "./contractFeatures";
import { calculateWeeklyBilan } from "./contractCalculations";
import type { ContractCalculationInput } from "./contract.types";

export function useContractFeatures(features: UserFeatures, isViewer: boolean) {
  const contract = useMemo(
    () => buildContractFeatures({ features: features || {}, isViewer }),
    [features, isViewer],
  );

  const calculate = (input: ContractCalculationInput) => calculateWeeklyBilan(input, contract);

  return {
    contract,
    calculate,
  };
}
