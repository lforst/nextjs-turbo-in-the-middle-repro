import {
  InstrumentationBase,
  InstrumentationConfig,
  InstrumentationNodeModuleDefinition,
  InstrumentationNodeModuleFile,
} from "@opentelemetry/instrumentation";

import type * as module_name_to_be_patched from "http";

export function register() {
  const myInstrumentation = new MyInstrumentation();
  myInstrumentation.enable();
}

// Most of the stuff below here is irrelevant, it is more important what nextjs is outputting in the .next folder because it resolves `require-in-the-middle` as `import-in-the-middle` which crashes opentelemetry.

export class MyInstrumentation extends InstrumentationBase {
  constructor(config: InstrumentationConfig = {}) {
    super("MyInstrumentation", "1", config);
  }
  protected init() {
    const module = new InstrumentationNodeModuleDefinition<
      typeof module_name_to_be_patched
    >(
      "module_name_to_be_patched",
      ["1.*"],
      this._onPatchMain,
      this._onUnPatchMain
    );
    module.files.push(this._addPatchingMethod());
    return module;
  }

  private _onPatchMain(moduleExports: typeof module_name_to_be_patched) {
    this._wrap(moduleExports, "get", this._patchMainMethodName());
    return moduleExports;
  }

  private _onUnPatchMain(moduleExports: typeof module_name_to_be_patched) {
    this._unwrap(moduleExports, "get");
  }

  private _addPatchingMethod(): InstrumentationNodeModuleFile<
    typeof module_name_to_be_patched
  > {
    const file = new InstrumentationNodeModuleFile<
      typeof module_name_to_be_patched
    >(
      "module_name_to_be_patched/src/some_file.js",
      this._onPatchMethodName as any,
      this._onUnPatchMethodName as any,
      () => {}
    );
    return file;
  }

  private _onPatchMethodName(moduleExports: typeof module_name_to_be_patched) {
    this._wrap(moduleExports, "get", this._patchMethodName());
    return moduleExports;
  }

  private _onUnPatchMethodName(
    moduleExports: typeof module_name_to_be_patched
  ) {
    this._unwrap(moduleExports, "get");
  }

  private _patchMethodName(): (original) => any {
    return function methodName(original) {
      return function patchMethodName(this: any) {
        console.log("get called", arguments);
        return original.apply(this, arguments);
      };
    };
  }

  private _patchMainMethodName(): (original) => any {
    return function mainMethodName(original) {
      return function patchMainMethodName(this: any) {
        console.log("get", arguments);
        return original.apply(this, arguments);
      };
    };
  }
}
