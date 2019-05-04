export interface UnicodeCharacter {
    name: string;
    alias?: string;
    number: string;
    value: string;
    /** Last used time in epoch time */
    lastSelected: number;
    /** `true` if unicode character is user defined */
    userDefined?: boolean;
}

export interface ScoredResult extends UnicodeCharacter {
    /** Lower score means a more accurate match */
    score: number;
}

export interface StoreData {
    [key: string]: any;
}
