// Jest mock for @prisma/client/runtime/library (Prisma v7 compatibility shim)
const actual = jest.requireActual('@prisma/client/runtime/client');

const DbNull = class DbNull {};
const JsonNull = class JsonNull {};
const AnyNull = class AnyNull {};

module.exports = {
  ...actual,
  objectEnumValues: {
    classes: { DbNull, JsonNull, AnyNull },
    instances: {
      DbNull: new DbNull(),
      JsonNull: new JsonNull(),
      AnyNull: new AnyNull(),
    },
  },
};
