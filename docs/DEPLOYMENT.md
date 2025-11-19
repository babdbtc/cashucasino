# Deployment Guide for Gamble BABD

This guide covers deploying the Gamble BABD casino application to your VPS at `gamble.babd.space`.

## Prerequisites

- VPS with Ubuntu/Debian (recommended)
- Node.js 18+ installed
- Nginx installed
- Domain `gamble.babd.space` pointing to your VPS IP
- SSL certificate (Let's Encrypt recommended)

## Step-by-Step Deployment

### 1. Clone the Repository

```bash
cd /var/www
sudo git clone <your-repo-url> gamble.babd
cd gamble.babd
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file (already included, but verify):

```bash
# Cashu Mint Configuration
NEXT_PUBLIC_CASHU_MINT_URL=https://mint.minibits.cash/Bitcoin

# Game Configuration
MAX_BET_SATS=1000
MIN_BET_SATS=1
```

### 4. Build the Application

```bash
npm run build
```

### 5. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 6. Update PM2 Configuration

Edit `ecosystem.config.js` and update the `cwd` path to your deployment directory:

```javascript
cwd: '/var/www/gamble.babd',
```

### 7. Create Logs Directory

```bash
mkdir logs
```

### 8. Start the Application with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

This will:
- Start the Next.js application
- Save the PM2 process list
- Configure PM2 to auto-start on system reboot

### 9. Configure Nginx

Copy the example Nginx configuration:

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/gamble.babd.space
```

Edit the file if needed:

```bash
sudo nano /etc/nginx/sites-available/gamble.babd.space
```

Create a symlink to enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/gamble.babd.space /etc/nginx/sites-enabled/
```

Test Nginx configuration:

```bash
sudo nginx -t
```

If successful, reload Nginx:

```bash
sudo systemctl reload nginx
```

### 10. Set Up SSL with Let's Encrypt

Install Certbot:

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

Obtain SSL certificate:

```bash
sudo certbot --nginx -d gamble.babd.space
```

Follow the prompts to configure SSL.

### 11. Set Up Firewall (if not already configured)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## Managing the Application

### View Logs

```bash
# PM2 logs
pm2 logs gamble-babd

# Application logs
tail -f logs/combined.log

# Nginx logs
sudo tail -f /var/log/nginx/gamble.babd.space.access.log
sudo tail -f /var/log/nginx/gamble.babd.space.error.log
```

### Restart Application

```bash
pm2 restart gamble-babd
```

### Stop Application

```bash
pm2 stop gamble-babd
```

### Update Application

```bash
cd /var/www/gamble.babd
git pull
npm install
npm run build
pm2 restart gamble-babd
```

## Monitoring

### Check PM2 Status

```bash
pm2 status
pm2 monit
```

### Check Nginx Status

```bash
sudo systemctl status nginx
```

## Security Considerations

1. **Keep dependencies updated**: Regularly run `npm audit` and `npm update`
2. **Monitor logs**: Check for unusual activity
3. **Backup regularly**: Set up automated backups of the application
4. **Rate limiting**: Consider adding rate limiting to Nginx to prevent abuse
5. **Legal compliance**: Ensure you comply with gambling laws in your jurisdiction

## Troubleshooting

### Application won't start

Check PM2 logs:
```bash
pm2 logs gamble-babd --err
```

### 502 Bad Gateway

- Check if the Next.js app is running: `pm2 status`
- Verify the port in Nginx config matches the app port (3000)
- Check firewall rules

### SSL certificate issues

Renew certificate:
```bash
sudo certbot renew
```

### Cashu integration errors

- Verify mint URL is correct in `.env.local`
- Check network connectivity to mint.minibits.cash
- Review application logs for specific errors

## Performance Optimization

1. **Enable Nginx caching** for static assets (already configured in example)
2. **Use a CDN** for static assets if traffic grows
3. **Monitor server resources** with tools like `htop` or cloud monitoring
4. **Consider using Redis** for session management if you add more games

## Support

For issues, check:
- Application logs: `pm2 logs gamble-babd`
- Nginx logs: `/var/log/nginx/gamble.babd.space.error.log`
- System logs: `journalctl -u nginx`
