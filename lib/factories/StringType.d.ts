import {AnyType} from './AnyType';

export class StringType extends AnyType {
    default?: string;
    enum?: string[];
    minLength?: number;
    maxLength?: number;
}