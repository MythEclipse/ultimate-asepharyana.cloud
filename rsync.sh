ssh -p 22 root@217.15.165.147 "cd /root/ultimate-asepharyana.tech && git pull"
# rsync -avz --progress --delete --force -e "ssh -p 22" /workspaces/ultimate-asepharyana.tech/apps/NextJS/.next root@217.15.165.147:/root/ultimate-asepharyana.tech/apps/NextJS/.next
# rsync -avz --progress --delete --force -e "ssh -p 22" /workspaces/ultimate-asepharyana.tech/apps/Express/dist root@217.15.165.147:/root/ultimate-asepharyana.tech/apps/Express/dist
ssh -p 22 root@217.15.165.147 "cd /root/ultimate-asepharyana.tech && pnpm run build"
ssh -p 22 root@217.15.165.147 "/root/.local/share/pnpm/pm2 restart express --update-env && /root/.local/share/pnpm/pm2 restart nextjs --update-env"

