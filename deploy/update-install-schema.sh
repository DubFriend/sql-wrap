#!/bin/bash

DATABASE="test"

INSTALL_PATH=install.sql

echo "
USE \`${DATABASE}\`;
" > $INSTALL_PATH

mysqldump -h127.0.0.1 \
          -uroot \
          -ppassword \
          --no-data \
          --skip-add-drop-table \
          $DATABASE \
          >> $INSTALL_PATH
