import { describe, expect, it } from "vitest";

import { databaseNameFromUri, resolveDatabaseName } from "@/lib/mongo-uri";

const CLUSTER = "mongodb+srv://u:p@cluster0.mongodb.net";

describe("databaseNameFromUri", () => {
  it("reads the database out of an Atlas SRV string", () => {
    expect(
      databaseNameFromUri(
        "mongodb+srv://user:pass@cluster0.abcde.mongodb.net/weeklyplate_dev?retryWrites=true&w=majority"
      )
    ).toBe("weeklyplate_dev");
  });

  it("reads the database out of a plain host string with a port", () => {
    expect(databaseNameFromUri("mongodb://localhost:27017/weeklyplate_dev")).toBe(
      "weeklyplate_dev"
    );
  });

  it("is not confused by a slash inside the password", () => {
    expect(
      databaseNameFromUri(
        "mongodb+srv://user:pa%2Fss/word@cluster0.mongodb.net/weeklyplate_prod?w=majority"
      )
    ).toBe("weeklyplate_prod");
  });

  it("returns null when no database is named, so callers can refuse to run", () => {
    expect(
      databaseNameFromUri(
        "mongodb+srv://user:pass@cluster0.mongodb.net/?retryWrites=true"
      )
    ).toBeNull();
    expect(
      databaseNameFromUri("mongodb+srv://user:pass@cluster0.mongodb.net")
    ).toBeNull();
  });

  it("returns null for a string that is not a MongoDB connection string", () => {
    expect(databaseNameFromUri("postgres://localhost:5432/weeklyplate")).toBeNull();
    expect(databaseNameFromUri("")).toBeNull();
  });

  it("decodes an escaped database name", () => {
    expect(
      databaseNameFromUri("mongodb://localhost:27017/weekly%20plate")
    ).toBe("weekly plate");
  });

  it("distinguishes the two databases that share our cluster", () => {
    expect(
      databaseNameFromUri(`${CLUSTER}/weeklyplate_dev?w=majority`)
    ).not.toBe(databaseNameFromUri(`${CLUSTER}/weeklyplate_prod?w=majority`));
  });
});

describe("resolveDatabaseName", () => {
  it("accepts a URI that matches the declared expectation", () => {
    expect(
      resolveDatabaseName(`${CLUSTER}/weeklyplate_dev?w=majority`, "weeklyplate_dev")
    ).toEqual({ databaseName: "weeklyplate_dev" });
  });

  it("refuses a production URI in an environment expecting dev", () => {
    expect(() =>
      resolveDatabaseName(`${CLUSTER}/test?w=majority`, "weeklyplate_dev")
    ).toThrow(/points at the "test" database but this environment expects/);
  });

  it("refuses an unnamed database when an expectation is declared", () => {
    expect(() =>
      resolveDatabaseName(`${CLUSTER}/?appName=mealplanner`, "weeklyplate_dev")
    ).toThrow(/does not name one/);
  });

  it("warns instead of throwing when no expectation is declared", () => {
    const { databaseName, warning } = resolveDatabaseName(
      `${CLUSTER}/?appName=mealplanner`,
      undefined
    );

    expect(databaseName).toBeNull();
    expect(warning).toMatch(/does not name a database/);
  });

  it("stays quiet when a database is named but nothing is expected", () => {
    expect(
      resolveDatabaseName(`${CLUSTER}/weeklyplate_dev?w=majority`, undefined)
    ).toEqual({ databaseName: "weeklyplate_dev" });
  });
});
