php /var/www/pterodactyl/artisan down
cd /var/www/pterodactyl/resources/scripts/components/dashboard
rm -rf ServerRow.tsx
wget https://raw.githubusercontent.com/RTK23-dev/pterodactyl-work/main/big-serverRow/ServerRow.tsx
npm i -g yarn
cd /var/www/pterodactyl
yarn install
yarn add @emotion/react
yarn build:production
php /var/www/pterodactyl/artisan up
clear
echo "Done addon has been installed thanks for using this script make sure to star the repo!"
