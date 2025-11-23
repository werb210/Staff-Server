cat > server/startup.sh << 'EOF'
#!/bin/bash
cd /home/site/wwwroot
node dist/index.js
EOF
