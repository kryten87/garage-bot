#!/bin/bash

# You need to adjust the sudo permissions for the user to allow
# systemctl start|stop|restart homebot
# without a password

APP_DIR=homebot
WORK_DIR=homebot-work
STAGING_DIR=homebot-staging
TEMP_DIR=homebot-temp
DRIVER_DIR=gpio-driver
DRIVER_STAGING_DIR=gpio-driver-temp
DRIVER_TEMP_DIR=gpio-driver-temp

BRANCH="$1"
if [ -n "$BRANCH" ]; then
  echo "[deployment] deploying branch '$BRANCH'"
fi

echo "[deployment] change to location"
cd /home/dave

# remove the old directories
echo "[deployment] clean up"
rm -rf "$TEMP_DIR" "$WORK_DIR" "$STAGING_DIR" "$DRIVER_TEMP_DIR"

# clone the repository
echo "[deployment] clone the repository"
git clone git@gitlab.com:dave137/home-bot.git "$WORK_DIR"

echo "[deployment] enter the directory"
cd "$WORK_DIR"

if [ -n "$BRANCH" ]; then
  echo "[deployment] checking out '$BRANCH'"
  git checkout "$BRANCH"
fi

# copy the GPIO driver dir
#
echo "[deployment] install gpio driver"
cp -Rp gpio-driver "/home/dave/$DRIVER_STAGING_DIR"

# install the dependencies
echo "[deployment] install dependencies"
npm install

# build the application
echo "[deployment] build the application"
npm run build

# move the build directory
echo "[deployment] move the application"
mv dist "/home/dave/$STAGING_DIR"
cp package.json "/home/dave/$STAGING_DIR/"

# install production dependencies
echo "[deployment] install production dependencies"
cd "/home/dave/$STAGING_DIR/"
npm install --production
cd /home/dave/

# copy .env from old dir to new
if [ -e "/home/dave/$APP_DIR" ]; then
  cp "/home/dave/$APP_DIR/.env" "/home/dave/$STAGING_DIR/.env"
fi

# stop the services
echo "[deployment] stop services"
sudo systemctl stop homebot
sudo systemctl stop gpio-driver
sleep 10s

echo "[deployment] removing pipes"
rm -rf /tmp/gpio_driver_*

echo "[deployment] replace homebot service"
if [ -e "/home/dave/$APP_DIR" ]; then
  mv "/home/dave/$APP_DIR" "/home/dave/$TEMP_DIR"
fi
mv "/home/dave/$STAGING_DIR" "/home/dave/$APP_DIR"

echo "[deployment] replace driver"
if [ -e "/home/dave/$DRIVER_DIR" ]; then
  mv "/home/dave/$DRIVER_DIR" "/home/dave/$DRIVER_TEMP_DIR"
fi
mv "/home/dave/$DRIVER_STAGING_DIR" "/home/dave/$DRIVER_DIR"

echo "[deployment] start services"
sudo systemctl start gpio-driver
sleep 2s
sudo systemctl start homebot

echo "[deployment] final clean up"
rm -rf "$TEMP_DIR" "$WORK_DIR" "$STAGING_DIR" "$DRIVER_TEMP_DIR" "$DRIVER_STAGING_DIR"
