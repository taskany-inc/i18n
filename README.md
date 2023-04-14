# I18N

Интерфейс для локализации текста с динамическими параметрами.

## Установка

```shell
$ npm i easy-typed-intl
```

## Использование

Определите модуль, который экспортирует функцию для определения текущей локали, например в `src/i18n/getLang.ts`

```ts
type Lang = 'ru' | 'en';

export default function getLang(): Lang {
    const maybeLang = navigator.language.split(/-|_/)[0];
    if (maybeLang) {
        return maybeLang as Lang;
    }

    return 'ru';
}
```

Если вы используете `--split` (см. **Опции генератора**), то данную функцию можно определить проще:

```ts
type Lang = 'ru' | 'en';

export default function getLang(): Lang {
    return process.env.REACT_APP_LANG as Lang;
}
```

В коде приложения оберните строку, для которой требуется перевод, в вызов функции `t` или `t.raw` (вы можете задать любое имя с помощью параметра `-f`, `--func`):

Было

```ts
React.useEffect(() => {
    alert('Очень удобное уведомление');
}, []);

return (
    <div>
        <span>Привет</span>
        <button type="button">
            Нажмите <Icon /> кнопку
        </button>
    </div>
);
```

Стало:

```tsx
React.useEffect(() => {
    alert(t('Очень удобное уведомление'));
}, []);

return (
    <div>
        <span>{t('Привет')}</span>
        <button type="button">{(t.raw('Нажмите {btn} кнопку'), { btn: <Icon key="somekey" /> })}</button>
    </div>
);
```

После чего запустите генератор командой

```
generate-i18n --langs=ru,en --path='src/components/**/*' --getLang='./src/i18n/getLang'
```

Результатом будет новый каталог, который будет помещён рядом с изменённым файлом и будет иметь примерно следующую структуру (зависит от используемых языков):

```
src/components/SomeComponent
├── SomeComponent.tsx
├── SomeComponent.i18n — файлы переводов
│   ├── ru.json — словарь для русского языка
│   ├── en.json — словарь для английского языка
│   └── index.ts — модуль, где хранится функция "t"
```

```json
// src/components/SomeComponent/SomeComponent.i18n/ru.json
{
  "Очень удобное уведомление": "",
  "Привет": ""
}

// src/components/SomeComponent/SomeComponent.i18n/en.json
{
  "Очень удобное уведомление": "",
  "Привет": ""
}
```

Далее, необходимо в код явно импортировать функцию `t` из только что созданного файла `src/components/SomeComponent/SomeComponent.i18n/index.ts`

```tsx
import { t } from './SomeComponent.i18n';
...
React.useEffect(() => {
    alert(t('Очень удобное уведомление'));
}, []);

return (
    <div>
        <span>{t('Привет')}</span>
        <button type="button">
            {t.raw('Нажмите {btn} кнопку'), {
                btn: <Icon key="somekey" />
            }}
        </button>
    </div>
);
```

Для сохранения контекста и передачи комментария переводчику, можно сразу после строки с ключом написать комментарии для дальнейшей [выгрузки](#Выгрузка):

```tsx
return <span>{t('Привет' /* Приветствие при включении устройства */)}</span>;
```

или

```tsx
return <span>{t(/* Приветствие при включении устройства */ 'Привет')}</span>;
```

## Опции генератора

-   `-l`, `--langs` – список языков через запятую, для перевода, включая базовый язык. Пример: `--langs=ru,en,es,jp`
-   `--getLang` – путь до модуля, экспортирующего по-умолчанию функцию для определения текущего языка
-   `-f`, `--func` – имя функции, которая будет вызываться в вашем проекте по назначению. По-умолчанию равно `t`.
-   `-s`, `--split` – разделить импорт файлов локализации с учётом значения `env`. Используйте этот флаг, если хотите для каждой локали сделать отдельную сборку
-   `-e`, `--env` – имя переменной окружения, в которой содержится текущая локаль. Используется только если передан парамтер `-s`. По-умолчанию `REACT_APP_LANG`
-   `--fmt` – путь до модуля форматирования. См. **Использование своего собственного модуля форматирования**
-   `--sort` – сортировать ключи в алфавитном порядке
-   `-p`, `--path` – список путей, в которых парсер будет искать вызов функции `func`

## Описание

Генератор json файлов использует `@babel/core` для получения строк. Существует три определяющих фактора, от которых напрямую зависит результат работы матчера:

1. вызов `t` (настраивается параметром `-f, --func`)
2. вызов `t.raw` (настраивается параметром `-f, --func`)
3. первый аргумент функции – это синтаксическая строка

Т.е. написать что-то вроде

```tsx
const text = 'Привет';
<span>{t(text)}</span>;
```

нельзя, т.к. первый аргумент синтаксически является переменной, также как и

```tsx
<span>{t('Привет' + '!')}</span>
```

где первый аргумент является выражением сложения, а не синтаксической строкой.

Функция `t` всегда возвращает строку.

Функция `t.raw` всегда возвращает массив, который содержит значения `string | number | null | T`, где `T` – generic-параметр функции, который будет выведен при использовании.

## Добавление команды в package.json

В секцию `scripts`, добавьте команду

```
"generate-i18n": "generate-i18n --langs=ru,en --path='./src/components/**/*' --getLang='./src/i18n/getLang'"
```

или более сложный вариант

```
"generate-i18n": "generate-i18n --split --langs=ru,en --fmt=./src/i18n --path='src/{components,containers,pages,utils,forms}/**/*' --getLang='./src/i18n/getLang'"
```

> На данный момент функция `t` автоматически не импортируется, поэтому необходимо самостоятельно добавить импорт
>
> ```tsx
> import { t } from './ComponentName.i18n';
> ```
>
> С использованием codeshift/recast можно сделать инъекцию импорта.

## Создание словарей переводов

Файлы с переводами лежат рядом с кодом, к которому они логически относятся. Файл словаря — модуль, в котором лежит кейсет для языка и функция `t`. По-умолчанию, если значение для ключа не задано, то функция `t` вернёт сам ключ. Если по какой-то причине вам все-таки требуется оставить поле пустым, вы можете добавить null в качестве значения.

`Entity/Entity.i18n/en.json`

```json
{
    "Пока": "Bye",
    "Привет": "Example",
    "Поле только в ru локали": null
}
```

`Entity/Entity.i18n/ru.json`

```json
{
    "Пока": "",
    "Привет": "",
    "Поле только в ru локали": "Привет"
}
```

## Форматирование

По-умолчанию i18n умеет только подставлять параметры. Например

```ts
function buy(apples: number, plums: number) {
    alert(
        t('Купи {apples}кг яблок и {plums}кг слив', {
            apples,
            plums,
        }),
    );
}

function buyRaw(apples: number, plums: number) {
    console.log(
        t.raw('Купи {apples}кг яблок и {plums}кг слив', {
            apples,
            plums,
        }),
    );
}

buy(3, 2); // alert('Купи 3кг яблок и 2кг слив')
buyRaw(3, 2); // console.log(['Купи ', 3, 'кг яблок и ', 2, 'кг слив'])
```

Метод `t.raw` может быть полезен, если вы хотите в форматируемую строку вставить компонент

## Использование своего собственного модуля форматирования

Если в проекте необходимо использовать более сложное форматирование, то с помощью параметра `--fmt` можно указать путь до своей собственной имплементации. Пример ниже добавляет поддержку синтаксиса [ICU](https://unicode-org.github.io/icu/userguide/format_parse/messages/) в функцию форматирования строки и используется форматирование по-умолчанию для массивов:

`src/i18n/formatter.ts`

```ts
import { IntlMessageFormat } from 'intl-messageformat';
import { I18nFormatter, I18nFormatterStr, formatRaw } from 'easy-typed-intl';

// модуль, определённый ранее для параметра --getLang
import getLang from './i18n/getLang';

const formatStr: I18nFormatterStr = (str, opts) => {
    const intl = new IntlMessageFormat(str, getLang());
    return intl.format(opts) as string;
};

const fmt: I18nFormatter = {
    str: formatStr,
    raw: formatRaw,
};

export default fmt;
```

`package.json`

```json
"generate-i18n": "generate-i18n --langs=ru,en --path='./src/components/**/*' --getLang='./src/i18n/getLang' --fmt=./src/i18n/formatter"
```

`src/components/SomeComponent.tsx`

```tsx
<span>
    {t(
        '{count, plural, one {# яблоко стоит} few {# яблока стоят} other {# яблок стоят}} {price, number, :: scale/0.01 . currency/RUB}',
        {
            count: props.applesCount,
            price: props.applePrice,
        },
    )}
</span>
```

Пример можно упростить если перенести форматирование из ключа в значение:

`src/components/SomeComponent.tsx`

```tsx
<span>
    {t('{count} {price}', {
        count: props.applesCount,
        price: props.applePrice,
    })}
</span>
```

`src/components/SomeComponent.i18n/ru.json`

```json
{
    "{count} {price}": "{count, plural, one {# яблоко стоит} few {# яблока стоят} other {# яблок стоят}} {price, number, :: scale/0.01 . currency/RUB}"
}
```

## Выгрузка

Для выгрузки переводов с мета информацией, добавьте команду в `package.json`:

```json
    "extract-i18n-meta": "extract-i18n-meta --langs=ru,en --path='./src/{components,containers,pages,utils,forms}/**/*'"
```

И запускайте `npm run extract-i18n-meta -- --out i18n-export.json`, что выведет в файл `i18n-export.json` JSON со всеми существующими переводами и комментариями, сгруппированным по скоупам:

```bash
$ npm run extract-i18n-meta

{
    "meta": {
        "meta": {
        "version": "1.3.0",
        "commit": "eca85282c2c40570c624b6e37c888fa8d3ac4675",
        "datetime": "Mon May 24 2021 09:19:42 GMT+0300 (GMT+03:00)",
        "timestamp": 1621837182414,
        "pathPrefix": "packages/awesome-package/",
        "repo": "git@github.com:easy-typed-intl.git"
    },
    "entries": {
        "src/components/ProductControls": {
            "Добавить": {
                "comment": "Кнопка добавления услуги",
                "translations": {
                    "en": "Add",
                    "ru": "Добавить"
                }
            }
        }
    }
}

```

## Импорт переводов

Для импорта переводов из файла, добавьте команду в `package.json`:

```json
    "import-i18n": "import-i18n --langs=ru,en --path='src/{components,containers,pages,utils,forms,hooks}/**/*'"
```

Запускайте с дополнительным параметром, укзывая имя файла с данными `npm run import-i18n -- --input i18n-export.json`.

После работы скрипта обновятся `json` файлы с языками, в случае наличия лишних ключей, предупреждение будет выведено в консоль.

## CSV

Для импорта и экспорта добавить в `package.json`:

```json
    "export-i18n-csv": "export-i18n-csv --lang=en --path='src/{components,containers,pages,utils,forms,hooks}/**/*'",
    "import-i18n-csv": "import-i18n-csv --lang=en --path='src/{components,containers,pages,utils,forms,hooks}/**/*'"
```

и запускать

```sh
npm run export-i18n-csv -- --out=b2b-translations.csv
```

В полученом файле формат

```csv
Привет, Надпись на странице онбординга, Hello
"Добро
Пожаловать", Пример многострочной строки, "Wel-
come"
```

Комментарий изменять нельзя, он также используется для идентификации перевода, т.к. одна фраза может быть в разных местах,
но переводиться на английский по-разному.

Импорт

```sh
npm run import-i18n -- --input=b2b-translations.csv
```
