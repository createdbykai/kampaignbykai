# KAMPAIGN By Kai

A desktop-first creative studio for building fashion marketing campaigns. The
app is built with Next.js, React, TypeScript, Tailwind CSS, and IndexedDB.

## Run the app

1. Install Node.js 20.9 or newer.
2. In the project folder, run `npm install`.
3. Run `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

The app's brand profiles, campaign drafts, and generated assets are designed to
stay in the current browser using IndexedDB.

Use the workspace switcher in the sidebar to create, rename, or switch between
workspaces. Each workspace has separate brands, campaigns, and generated assets;
existing data is kept in the original **Kai's workspace**. You can delete a
workspace only when more than one exists, and deleting it permanently removes
its data.

## Create your first campaign

1. Add your clothing brand from **My Brands**. Include a brand description to
   generate an optional slogan based on your brand name and description.
2. Choose **Create campaign** and follow the three short steps.
3. Generate and review the written campaign strategy.
4. Edit or regenerate any strategy section if you want to.
5. Only when you approve, choose an image category, output format, and up to
   four images. Images are requested one at a time and saved to the local asset
   library, where you can download or remove them. Deleting a campaign image
   also removes it from the asset library.

Use **Image Generation** to create an image outside a campaign. Choose a saved
brand, then select Logo or Image Generation. Logos use Nano Banana 2.1 and let
you choose an output format and enter a prompt. Campaign images let you choose
an image category, output format, model, and prompt. Generated images are saved
to the asset library.

Saved campaigns are available from **My Campaigns**, above **My Brands** in the
menu.

Campaign templates include editorial imagery and several creative starting
points. Image formats are independent from image categories: portrait (4:5),
landscape (16:9), square (1:1), or story (9:16).
Campaign image generation supports eight categories, from hero photography and
campaign posters to product spotlights, lookbooks, graphic design, and
environmental lifestyle imagery. Choose an official Pollinations image model
for campaign images and brand logos from the built-in model list.

No campaign images are generated when you create the written strategy.

## Pollinations API key

AI features use a server-side `POLLINATIONS_API_KEY`. Copy `.env.example` to
`.env.local`, replace the placeholder with your key, and restart the app:

```bash
cp .env.example .env.local
```

Never put the key in client-side code, add a `NEXT_PUBLIC_` prefix, or commit
`.env.local`; environment files are ignored by Git.

You can explore the studio before configuring an API key. Campaign writing and
image generation require an active Pollinations API key. Keys can be created or
managed at [Pollinations](https://enter.pollinations.ai/keys).

## Graffiti font

The interface uses the Splatink font when its font file is available at
`public/fonts/Splatink.otf`. Add your licensed copy there; otherwise the browser
uses the built-in display-font fallback.

## Checks

```bash
npm run lint
npm run build
```

## Production build

```bash
npm run build
npm run start
```
