import { I18nFormatter, I18nGetLang, I18nLangSet, I18nRaw } from './types';

/**
 * Локализация ключей по словарю в строку.
 *
 * @param keyset словарь с переводами
 * @param key ключ для кейсета
 * @param options динамические параметры ключа
 */
export function i18n<L extends string, T extends string>(
    langSet: I18nLangSet<T>,
    formatter: I18nFormatter,
    getLang: I18nGetLang<L>,
) {
    const lang = getLang();

    function resolveMsg(key: T): string {
        if (!lang) {
            throw new Error('Не установлено значение локали');
        }

        const keyset = langSet[lang];
        if (!keyset) {
            throw new Error('Не определён набор ключей для перевода');
        }

        return keyset[key] || key;
    }

    function wrapped(key: T, opts?: Record<string, string | number>): string {
        const msg = resolveMsg(key);
        return formatter.str(msg, opts || {});
    }

    wrapped.raw = <P>(key: T, opts?: Record<string, string | number | P>): I18nRaw<P> => {
        const msg = resolveMsg(key);
        return formatter.raw(msg, opts || {});
    };

    return wrapped;
}
