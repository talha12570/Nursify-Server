const PRICING = {
    hourlyRate: 1000,
    dailySlots: {
        4: 3000,
        6: 4000,
    },
    weeklyPerDay: {
        1: 1000,
        2: 2000,
        3: 2500,
    },
};

const isPricingEligible = (caregiver) => {
    if (!caregiver) return false;
    return (caregiver.totalBookings || 0) > 10 && (caregiver.rating || 0) > 4.5;
};

const normalizeOverride = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getDailyAmount = (hours) => PRICING.dailySlots[hours] || null;

const getWeeklyPerDayAmount = (hoursPerDay) => PRICING.weeklyPerDay[hoursPerDay] || null;

const getWeeklyTotalAmount = (hoursPerDay) => {
    const perDay = getWeeklyPerDayAmount(hoursPerDay);
    return perDay ? perDay * 7 : null;
};

const getEffectivePricing = (caregiver) => {
    const eligible = isPricingEligible(caregiver);
    const overrides = caregiver?.pricingOverrides || {};

    return {
        eligible,
        hourly: eligible && normalizeOverride(overrides.hourly) ? overrides.hourly : PRICING.hourlyRate,
        daily4: eligible && normalizeOverride(overrides.daily4) ? overrides.daily4 : PRICING.dailySlots[4],
        daily6: eligible && normalizeOverride(overrides.daily6) ? overrides.daily6 : PRICING.dailySlots[6],
        weekly1: eligible && normalizeOverride(overrides.weekly1) ? overrides.weekly1 : PRICING.weeklyPerDay[1],
        weekly2: eligible && normalizeOverride(overrides.weekly2) ? overrides.weekly2 : PRICING.weeklyPerDay[2],
        weekly3: eligible && normalizeOverride(overrides.weekly3) ? overrides.weekly3 : PRICING.weeklyPerDay[3],
    };
};

module.exports = {
    PRICING,
    isPricingEligible,
    getDailyAmount,
    getWeeklyPerDayAmount,
    getWeeklyTotalAmount,
    getEffectivePricing,
};
