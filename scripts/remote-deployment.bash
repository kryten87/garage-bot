#!/bin/bash

APP_DIR=homebot
WORK_DIR=homebot-work
STAGING_DIR=homebot-staging
TEMP_DIR=homebot-temp

echo "[deployment] change to location"
cd /home/dave

# remove the old directories
echo "[deployment] clean up"
rm -rf "$TEMP_DIR" "$WORK_DIR" "$STAGING_DIR"

# clone the repository
echo "[deployment] clone the repository"
git clone git@gitlab.com:dave137/home-bot.git "$WORK_DIR"

echo "[deployment] enter the directory"
cd "$WORK_DIR"

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

# stop the service
echo "[deployment] stop service"
sudo systemctl stop homebot
sleep 10s

echo "[deployment] replace service"
if [ -e "/home/dave/$APP_DIR" ]; then
  mv "/home/dave/$APP_DIR" "/home/dave/$TEMP_DIR"
fi
mv "/home/dave/$STAGING_DIR" "/home/dave/$APP_DIR"

echo "[deployment] start service"
sudo systemctl start homebot

echo "[deployment] final clean up"
rm -rf "$TEMP_DIR" "$WORK_DIR" "$STAGING_DIR"
