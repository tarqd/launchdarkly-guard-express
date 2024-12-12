# LaunchDarkly Guard Express

This project automatically instruments express.js applications with LaunchDarkly metrics for use with guarded rollouts. 

## Features

- Automatically tracks request duration and error events
- Automatically uses the last context evaluated during the currently active request
- Uses async hooks to ensure intereleaved requests are tracked correctly
- Optional: Creates a helpful "request" context you can use for evaluation


## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## Installation

To install the dependencies, run:

```bash
npm install
```

## Usage

To start the application, use:

```bash
npm start
```

## Configuration

Create a `.env` file in the root directory and add your LaunchDarkly SDK key:

```env
LD_SDK_KEY=your_launchdarkly_sdk_key
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
