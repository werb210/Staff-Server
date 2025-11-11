import { validate as uuidValidate, version as uuidVersion } from "uuid";

export const isUuid = (value: string): boolean => {
  return uuidValidate(value) && uuidVersion(value) === 4;
};
