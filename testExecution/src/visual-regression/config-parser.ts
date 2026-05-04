import * as fs from 'fs';
import * as path from 'path';

// --- Interfaces ---

export interface FieldDescriptor {
  label: string;
  type: 'text' | 'dropdown' | 'checkbox' | 'radio' | 'toggle' | 'date' | 'date-end';
  selector: string;
  maxlength: number | null;
  required: boolean;
}

export interface ModuleDescriptor {
  name: string;
  sidebarPath: string[];
  listPageUrl: string;
  formTriggerSelector: string | null;
  fields: FieldDescriptor[];
}

export interface ModuleConfig {
  version: string;
  discoveredAt: string; // ISO 8601 timestamp
  modules: ModuleDescriptor[];
}

// --- Valid field types ---

const VALID_FIELD_TYPES: ReadonlySet<string> = new Set([
  'text',
  'dropdown',
  'checkbox',
  'radio',
  'toggle',
  'date',
  'date-end',
]);

// --- ConfigParser ---

export class ConfigParser {
  static readonly CONFIG_PATH = 'visual-regression/config/modules.json';

  /**
   * Deserialize JSON file to ModuleConfig.
   * Throws with line number and character position on JSON syntax errors.
   */
  read(): ModuleConfig {
    const fullPath = path.resolve(process.cwd(), ConfigParser.CONFIG_PATH);
    const raw = fs.readFileSync(fullPath, 'utf-8');

    try {
      return JSON.parse(raw) as ModuleConfig;
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Extract position from SyntaxError message (e.g., "... at position 42")
        const posMatch = err.message.match(/position\s+(\d+)/i);
        if (posMatch) {
          const position = parseInt(posMatch[1], 10);
          const { line, character } = this.getLineAndChar(raw, position);
          throw new SyntaxError(
            `JSON syntax error at line ${line}, character ${character}: ${err.message}`
          );
        }
      }
      throw err;
    }
  }

  /**
   * Serialize ModuleConfig to indented JSON (2-space indent).
   * Creates parent directories if they don't exist.
   */
  write(config: ModuleConfig): void {
    const fullPath = path.resolve(process.cwd(), ConfigParser.CONFIG_PATH);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    const json = JSON.stringify(config, null, 2);
    fs.writeFileSync(fullPath, json, 'utf-8');
  }

  /**
   * Validate a JSON string against the ModuleConfig schema.
   * Returns an array of error messages describing violations.
   */
  validate(json: string): string[] {
    const errors: string[] = [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      errors.push('Invalid JSON: unable to parse');
      return errors;
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      errors.push('Root value must be a JSON object');
      return errors;
    }

    const obj = parsed as Record<string, unknown>;

    // version
    if (!('version' in obj)) {
      errors.push("Missing required field 'version'");
    } else if (typeof obj.version !== 'string') {
      errors.push("'version' must be a string");
    }

    // discoveredAt
    if (!('discoveredAt' in obj)) {
      errors.push("Missing required field 'discoveredAt'");
    } else if (typeof obj.discoveredAt !== 'string') {
      errors.push("'discoveredAt' must be a string");
    }

    // modules
    if (!('modules' in obj)) {
      errors.push("Missing required field 'modules'");
    } else if (!Array.isArray(obj.modules)) {
      errors.push("'modules' must be an array");
    } else {
      (obj.modules as unknown[]).forEach((mod, i) => {
        errors.push(...this.validateModule(mod, i));
      });
    }

    return errors;
  }

  /**
   * Merge discovered modules with existing config.
   * Modules matched by name — existing entries are preserved (manual edits win).
   * New modules from discovery are appended.
   * Returns merged config with discovered's version and discoveredAt.
   */
  merge(existing: ModuleConfig, discovered: ModuleConfig): ModuleConfig {
    const existingByName = new Map<string, ModuleDescriptor>();
    for (const mod of existing.modules) {
      existingByName.set(mod.name, mod);
    }

    const mergedModules: ModuleDescriptor[] = [...existing.modules];

    for (const discoveredMod of discovered.modules) {
      const existingMod = existingByName.get(discoveredMod.name);
      if (existingMod) {
        // Same name exists — existing entry is preserved (manual edits win).
        // Log conflict if structures differ.
        if (!this.modulesEqual(existingMod, discoveredMod)) {
          console.log(
            `[CONFIG MERGE] Conflict for module "${discoveredMod.name}": ` +
              'existing entry preserved (manual edits win). ' +
              'Discovered version differs in structure.'
          );
        }
      } else {
        // New module — append
        mergedModules.push(discoveredMod);
      }
    }

    return {
      version: discovered.version,
      discoveredAt: discovered.discoveredAt,
      modules: mergedModules,
    };
  }

  // --- Private helpers ---

  /**
   * Convert a character position in a string to line number and character offset.
   */
  private getLineAndChar(text: string, position: number): { line: number; character: number } {
    let line = 1;
    let lastNewline = -1;
    for (let i = 0; i < position && i < text.length; i++) {
      if (text[i] === '\n') {
        line++;
        lastNewline = i;
      }
    }
    const character = position - lastNewline;
    return { line, character };
  }

  /**
   * Validate a single module entry at the given index.
   */
  private validateModule(mod: unknown, index: number): string[] {
    const errors: string[] = [];
    const prefix = `Module at index ${index}`;

    if (typeof mod !== 'object' || mod === null || Array.isArray(mod)) {
      errors.push(`${prefix}: must be a JSON object`);
      return errors;
    }

    const m = mod as Record<string, unknown>;

    // name
    if (!('name' in m)) {
      errors.push(`${prefix}: missing required field 'name'`);
    } else if (typeof m.name !== 'string' || m.name.length === 0) {
      errors.push(`${prefix}: 'name' must be a non-empty string`);
    }

    // sidebarPath
    if (!('sidebarPath' in m)) {
      errors.push(`${prefix}: missing required field 'sidebarPath'`);
    } else if (
      !Array.isArray(m.sidebarPath) ||
      m.sidebarPath.length === 0 ||
      !m.sidebarPath.every((s: unknown) => typeof s === 'string')
    ) {
      errors.push(`${prefix}: 'sidebarPath' must be a non-empty array of strings`);
    }

    // listPageUrl
    if (!('listPageUrl' in m)) {
      errors.push(`${prefix}: missing required field 'listPageUrl'`);
    } else if (typeof m.listPageUrl !== 'string') {
      errors.push(`${prefix}: 'listPageUrl' must be a string`);
    }

    // formTriggerSelector
    if ('formTriggerSelector' in m) {
      if (m.formTriggerSelector !== null && typeof m.formTriggerSelector !== 'string') {
        errors.push(`${prefix}: 'formTriggerSelector' must be a string or null`);
      }
    }

    // fields
    if (!('fields' in m)) {
      errors.push(`${prefix}: missing required field 'fields'`);
    } else if (!Array.isArray(m.fields)) {
      errors.push(`${prefix}: 'fields' must be an array`);
    } else {
      (m.fields as unknown[]).forEach((field, fi) => {
        errors.push(...this.validateField(field, index, fi));
      });
    }

    return errors;
  }

  /**
   * Validate a single field entry within a module.
   */
  private validateField(field: unknown, moduleIndex: number, fieldIndex: number): string[] {
    const errors: string[] = [];
    const prefix = `Module at index ${moduleIndex}, field at index ${fieldIndex}`;

    if (typeof field !== 'object' || field === null || Array.isArray(field)) {
      errors.push(`${prefix}: must be a JSON object`);
      return errors;
    }

    const f = field as Record<string, unknown>;

    // label
    if (!('label' in f)) {
      errors.push(`${prefix}: missing required field 'label'`);
    } else if (typeof f.label !== 'string' || f.label.length === 0) {
      errors.push(`${prefix}: 'label' must be a non-empty string`);
    }

    // type
    if (!('type' in f)) {
      errors.push(`${prefix}: missing required field 'type'`);
    } else if (typeof f.type !== 'string' || !VALID_FIELD_TYPES.has(f.type)) {
      errors.push(
        `${prefix}: 'type' must be one of: text, dropdown, checkbox, radio, toggle`
      );
    }

    // selector
    if (!('selector' in f)) {
      errors.push(`${prefix}: missing required field 'selector'`);
    } else if (typeof f.selector !== 'string' || f.selector.length === 0) {
      errors.push(`${prefix}: 'selector' must be a non-empty string`);
    }

    // maxlength
    if ('maxlength' in f) {
      if (f.maxlength !== null && typeof f.maxlength !== 'number') {
        errors.push(`${prefix}: 'maxlength' must be a number or null`);
      }
    }

    // required
    if (!('required' in f)) {
      errors.push(`${prefix}: missing required field 'required'`);
    } else if (typeof f.required !== 'boolean') {
      errors.push(`${prefix}: 'required' must be a boolean`);
    }

    return errors;
  }

  /**
   * Deep-compare two ModuleDescriptors for structural equality.
   */
  private modulesEqual(a: ModuleDescriptor, b: ModuleDescriptor): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
