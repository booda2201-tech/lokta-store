# Loqta

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.16.

## Development server

Use Node.js 22.18+ (Node.js 24 recommended). Copy `.env.example` to `.env.local` and set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` for your Telegram bot and destination chat. Keep these values on the server; never place it in Angular source files.

Run `npm start` to start Angular on `http://localhost:4200/` and the orders API on `127.0.0.1:3001`. Angular proxies `/api` to the API. If Angular is already running, restart it to load the proxy configuration; `npm run start:api` starts only the API.

On Vercel, configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in the project's environment variables; `api/send-order.ts` handles the same endpoint in production. Orders succeed only after Telegram accepts the message.

Use the Angular framework preset, build command `npm run build`, and output directory `dist/loqta`. Redeploy after setting the environment variable. See the [Vercel Node.js function documentation](https://vercel.com/docs/functions/runtimes/node-js).

The checkout stays on the product page: confirmation sends the order in the background, closes the modal after success, and displays `تم استلام طلبك بنجاح! 🎉`. Failed requests preserve the form for retry.

The cart orders everything at once: each bag line keeps its own size, colour and quantity (up to 10 per product, stored in `lokta-cart`), and `اطلب الشنطة كلها` sends all of them in one request as `items` (`productTitle`, `size`, `color`, `price`, `quantity`). The API lists one line per product and totals the order itself, so `price` at the top level is ignored for cart orders; the cart is emptied only after Telegram accepts the message. Orders without `items` keep the single-product format. A local `/api/send-order` gateway timeout usually means the API process is not running; use `npm start` (or `npm run start:api` alongside an existing Angular server).

Run `npm run test:orders` for API validation and delivery failure tests with mocked Telegram responses (no real orders are sent).

Checkout includes the selected product image as `productImage`; the API also accepts `imageUrl`. Orders use Telegram `sendPhoto` with an HTML caption, falling back to `sendMessage` if no image is provided or photo delivery fails. Captions longer than 1024 characters use text directly to preserve all details. Images must be accessible to Telegram (local-only URLs will fall back to text). See [Telegram sendPhoto](https://core.telegram.org/bots/api#sendphoto).

Telegram messages use HTML formatting with customer values escaped and the 4096-character message limit checked before sending. Missing text fields default to `غير محدد`, and a missing price defaults to zero. See the [Telegram sendMessage documentation](https://core.telegram.org/bots/api#sendmessage). Restart the local API after changing environment variables.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
