import type { ErrorCode } from '../ErrorCode';

// Represents an ad
export type AdInfo = {
    // The ad unit ID for which this ad was loaded.
    adUnitId: string;
    // The total latency in milliseconds for this waterfall to finish processing.
    latencyMillis: number;
};

// Encapsulates various data for MAX load errors.
export type AdLoadFailedInfo = {
    // The ad unit ID for which this ad was loaded.
    adUnitId: string;

    // The error code for the error.
    code: ErrorCode;

    message: string;

    // The total latency in milliseconds for this waterfall to finish processing.
    latencyMillis: number;
};

// Encapsulates various data for MAX display errors.
export type AdDisplayFailedInfo = {
    message: string | null;
};

// Represents a reward given to the user.
export type AdRewardInfo = {
    // The reward label.
    rewardLabel?: string | null;

    // The rewarded amount.
    rewardAmount: string;
};