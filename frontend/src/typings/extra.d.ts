
declare interface ObjectConstructor {
    assign(target: any, ...sources: any[]): any;
}

interface Array<T> {
    find(predicate: (value: T, index: number, obj: Array<T>) => boolean, thisArg?: any): T | undefined;
}

declare module "zenscroll";
declare module "signature_pad";

