import { I18nRaw, I18nFormatter, I18nFormatterRaw, I18nFormatterStr } from './types';

function traverse<T>(msg: string, options: Record<string, string | number | T>): I18nRaw<T> {
    const len = msg.length;

    let pos = 0;

    const res: I18nRaw<T> = [];

    while (pos < len) {
        const p1 = msg.indexOf('{', pos);

        if (p1 === -1) {
            // нет открывающих фигурных скобок - копируем весь остаток строки
            res.push(msg.substring(pos));
            return res;
        }

        const p2 = msg.indexOf('}', p1);
        if (p2 === -1) {
            res.push(msg.substring(pos));
            // edge case: не хватает закрывающей фигурной скобки - копируем весь остаток строки
            // чтобы быть полностью совместимым с оригинальной реализацией, надо сделать
            // res.push(
            //     template.substring(pos, p1),
            //     template.substring(p1 + 1)
            // );
            return res;
        }

        const value = options[msg.substring(p1 + 1, p2)];

        res.push(msg.substring(pos, p1), value);
        pos = p2 + 1;
    }

    return res;
}

export const formatStr: I18nFormatterStr = (msg, options) => {
    const res = traverse(msg, options);
    return res.join('');
};

export const formatRaw: I18nFormatterRaw = (msg, options) => {
    const res = traverse(msg, options);
    return res;
};

export const fmt: I18nFormatter = {
    raw: formatRaw,
    str: formatStr,
};
