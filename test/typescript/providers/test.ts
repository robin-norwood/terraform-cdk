import { TestDriver } from "../../test-helper";

describe("full integration test", () => {
  let driver: TestDriver;

  beforeAll(async () => {
    driver = new TestDriver(__dirname);
    await driver.setupTypescriptProject();
  });

  test("build providers", () => {
    expect(driver.deploy("using-all-providers")).toMatchSnapshot();
  });

  describe("provider functionality", () => {
    beforeAll(async () => {
      await driver.synth();
    });

    test("namespaces", () => {
      const stack = driver.synthesizedStack("namespaces");
      expect(stack).toMatchSnapshot();
    });

    test("references", () => {
      const stack = driver.synthesizedStack("references");
      // TODO: write a proper test matcher
      expect(stack).toMatchSnapshot();
    });

    test("mutation", () => {
      const stack = driver.synthesizedStack("mutation");
      // TODO: write a proper test matcher
      expect(stack).toMatchSnapshot();
    });
  });
});
