/**
 * Отображение кейсета i18n.
 */
export type I18nKeyset<T extends string> = Record<T, string | null>;

export type I18nRaw<T> = Array<string | number | null | T>;

/**
 * Коллекция кейсетов по языку
 */
export type I18nLangSet<T extends string> = Record<string, I18nKeyset<T>>;

export type I18nFormatterStr = (msg: string, options: Record<string, string | number>) => string;

export type I18nFormatterRaw = <T>(msg: string, options: Record<string, string | number | null | T>) => I18nRaw<T>;

/**
 * Форматтер для обработки сообщений
 */
export type I18nFormatter = {
    raw: I18nFormatterRaw;
    str: I18nFormatterStr;
};

/**
 * Функция для получения значения локали
 */
export type I18nGetLang<T extends string> = () => T;
