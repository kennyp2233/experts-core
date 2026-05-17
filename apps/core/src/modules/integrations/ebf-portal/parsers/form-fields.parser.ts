export interface FormFieldSpec {
  name: string;
  type: string;
  value: string | null;
  required: boolean;
  options?: { value: string; label: string }[];
}

export interface FormSpec {
  action: string | null;
  method: string;
  fields: FormFieldSpec[];
  csrfToken: string | null;
}

const FORM_RX = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
const INPUT_RX = /<input\b([^>]*)>/gi;
const SELECT_RX = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
const TEXTAREA_RX = /<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi;
const OPTION_RX = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
const ATTR_RX = /(\w[\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;

function parseAttrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RX.exec(tag)) !== null) {
    const val = m[2] ?? m[3] ?? m[4] ?? '';
    out[m[1].toLowerCase()] = val;
  }
  return out;
}

/**
 * Parser genérico de <form> Django/allauth. Pensado para introspectar el
 * form de "Nueva coordinación" / "Editar coordinación" cuando estén
 * accesibles. Devuelve todos los forms del HTML — el caller filtra el que
 * le interesa por `action`.
 */
export function parseForms(html: string): FormSpec[] {
  const forms: FormSpec[] = [];
  FORM_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FORM_RX.exec(html)) !== null) {
    const formAttrs = parseAttrs(m[1]);
    const body = m[2];
    const fields: FormFieldSpec[] = [];

    INPUT_RX.lastIndex = 0;
    let im: RegExpExecArray | null;
    while ((im = INPUT_RX.exec(body)) !== null) {
      const a = parseAttrs(im[1]);
      if (!a.name) continue;
      fields.push({
        name: a.name,
        type: a.type ?? 'text',
        value: a.value ?? null,
        required: 'required' in a,
      });
    }

    SELECT_RX.lastIndex = 0;
    while ((im = SELECT_RX.exec(body)) !== null) {
      const a = parseAttrs(im[1]);
      if (!a.name) continue;
      const optionsHtml = im[2];
      const options: { value: string; label: string }[] = [];
      OPTION_RX.lastIndex = 0;
      let om: RegExpExecArray | null;
      while ((om = OPTION_RX.exec(optionsHtml)) !== null) {
        const oa = parseAttrs(om[1]);
        options.push({
          value: oa.value ?? '',
          label: om[2].replace(/<[^>]+>/g, '').trim(),
        });
      }
      fields.push({
        name: a.name,
        type: 'select',
        value: null,
        required: 'required' in a,
        options,
      });
    }

    TEXTAREA_RX.lastIndex = 0;
    while ((im = TEXTAREA_RX.exec(body)) !== null) {
      const a = parseAttrs(im[1]);
      if (!a.name) continue;
      fields.push({
        name: a.name,
        type: 'textarea',
        value: im[2].trim() || null,
        required: 'required' in a,
      });
    }

    const csrf = fields.find((f) => f.name === 'csrfmiddlewaretoken');

    forms.push({
      action: formAttrs.action ?? null,
      method: (formAttrs.method ?? 'get').toLowerCase(),
      fields,
      csrfToken: csrf?.value ?? null,
    });
  }
  return forms;
}
