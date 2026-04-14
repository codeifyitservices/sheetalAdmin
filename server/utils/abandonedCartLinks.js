import { config } from "../config/config.js";

const RECOVERY_STAGE_MAP = {
  first: 1,
  second: 2,
  third: 3,
  final: 4,
};

export const buildAbandonedCartOrderUrl = (cartId, recoveryMeta = {}) => {
  const checkoutUrl = new URL(
    `${config.frontendDomain.replace(/\/$/, "")}/checkout`,
  );

  checkoutUrl.searchParams.set("cartId", cartId);

  if (recoveryMeta.source) {
    checkoutUrl.searchParams.set("recoverySource", recoveryMeta.source);
  }

  if (recoveryMeta.stage != null) {
    checkoutUrl.searchParams.set("recoveryStage", String(recoveryMeta.stage));
  } else if (
    recoveryMeta.reminderStage &&
    RECOVERY_STAGE_MAP[recoveryMeta.reminderStage]
  ) {
    checkoutUrl.searchParams.set(
      "recoveryStage",
      String(RECOVERY_STAGE_MAP[recoveryMeta.reminderStage]),
    );
  }

  if (recoveryMeta.cycleId) {
    checkoutUrl.searchParams.set("recoveryCycleId", recoveryMeta.cycleId);
  }

  if (recoveryMeta.couponCode) {
    checkoutUrl.searchParams.set("couponCode", recoveryMeta.couponCode);
  }

  return checkoutUrl.toString();
};

