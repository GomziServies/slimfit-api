module.exports = {
	apps: [
		{
			name: 'FG_GROUP-DEV-8080',
			script: './server.js',
			env: {
				NODE_ENV: 'development',
				PORT: 8080,
			},
			max_memory_restart: '350M',
			node_args: '--trace-warnings',
		},
		{
			name: 'FG_GROUP-PROD-8082',
			script: './server.js',
			env: {
				NODE_ENV: 'production',
				PORT: 8082,
			},
			max_memory_restart: '500M',
			node_args: '--trace-warnings',
		},
	],
};
