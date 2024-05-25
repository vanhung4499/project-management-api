# -*- mode: ruby -*-
# vi: set ft=ruby :


Vagrant.configure("2") do |config|

  config.vm.box = "generic/ubuntu2204"

  config.vm.network "public_network"

  config.vm.network "forwarded_port", guest: 3000, host: 3000

  config.vm.synced_folder ".", "/vagrant", type: "virtualbox"

  config.vm.provider "virtualbox" do |vb|
     vb.memory = "2048"
  end

  config.vm.provision "shell", inline: <<-SHELL
    sudo apt-get update
    # Install MongoDB
    sudo apt install software-properties-common gnupg apt-transport-https ca-certificates -y
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc |  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod

    # Install Node.js
    curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    sudo apt-get install -y build-essential

    # Install PM2
    sudo npm install -g pm2
    # Install Yarn
    sudo npm install --global yarn

    # Run the API
    cd /vagrant
    yarn install
    pm2 start yarn --name api -- start -- --port 3000

    # Install ngrok
    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
	  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
	  && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
	  | sudo tee /etc/apt/sources.list.d/ngrok.list \
	  && sudo apt update \
	  && sudo apt install ngrok
    # Auth ngrok
    ngrok config add-authtoken 2gxkSXve6LIwpwYSueFbPjP6qM7_7CRVmUs5fiXQnkUb2pgzD

    # Run ngrok
    ngrok http http://localhost:3000

    SHELL
end
