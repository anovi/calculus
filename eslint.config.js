import tsParser from '@typescript-eslint/parser';
import noDeepCrossModuleImports from './eslint-rules/no-deep-cross-module-imports.mjs';

export default [
	{
		files: ['src/**/*.ts'],
		ignores: ['**/*.spec.ts'],
		languageOptions: {
			parser: tsParser,
		},
		plugins: {
			'compio-architecture': {
				rules: {
					'no-deep-cross-module-imports': noDeepCrossModuleImports,
				},
			},
		},
		rules: {
			'compio-architecture/no-deep-cross-module-imports': 'error',
		},
	},
];
