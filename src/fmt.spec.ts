import { fmt } from './fmt';

describe('easy-typed-intl', () => {
    describe('fmt.str', () => {
        it('should work without params', () => {
            expect(fmt.str('Simple flat string', {})).toEqual('Simple flat string');
        });

        it('should substitute params', () => {
            expect(
                fmt.str('First: {first}; second: {second}', {
                    first: 1,
                    second: 'test',
                }),
            ).toEqual('First: 1; second: test');
        });
    });

    describe('fmt.raw', () => {
        it('should substitute and return an array', () => {
            expect(
                fmt.raw('First: {first}; second: {second}', {
                    first: 1,
                    second: 'test',
                }),
            ).toEqual(['First: ', 1, '; second: ', 'test']);

            expect(
                fmt.raw('Some {first} complex {second} object {third}', {
                    first: 1,
                    second: 'test',
                    third: { a: 1, b: 2 },
                }),
            ).toEqual(['Some ', 1, ' complex ', 'test', ' object ', { a: 1, b: 2 }]);
        });

        it('should work without params', () => {
            expect(fmt.raw('Simple flat string', {})).toEqual(['Simple flat string']);
        });
    });
});
