resource "local_file" "ansible_inventory" {
  filename = "${path.module}/../ansible/inventory.ini"
  content  = <<-EOT
    [bastions]
    bastion ansible_host=bastion ansible_user=ubuntu

    [masters]
    master ansible_host=master ansible_user=ubuntu

    [workers]
    worker_node_1 ansible_host=worker-1 ansible_user=ubuntu
    worker_node_2 ansible_host=worker-2 ansible_user=ubuntu

    [all:vars]
    ansible_user=ubuntu
    ansible_ssh_private_key_file=~/.ssh/aws-default.pem
  EOT
}

resource "local_file" "ansible_ssh_config" {
  filename = "${path.module}/../ansible/ssh.config"
  content  = <<-EOT
    Host bastion
      HostName ${aws_instance.bastian_server.public_ip}
      User ubuntu
      IdentityFile ~/.ssh/aws-default.pem
      IdentitiesOnly yes

    Host master
      HostName ${aws_instance.master_node.private_ip}
      User ubuntu
      IdentityFile ~/.ssh/aws-default.pem
      IdentitiesOnly yes
      ProxyJump bastion

    Host worker-1
      HostName ${aws_instance.worker_node_1.private_ip}
      User ubuntu
      IdentityFile ~/.ssh/aws-default.pem
      IdentitiesOnly yes
      ProxyJump bastion

    Host worker-2
      HostName ${aws_instance.worker_node_2.private_ip}
      User ubuntu
      IdentityFile ~/.ssh/aws-default.pem
      IdentitiesOnly yes
      ProxyJump bastion
  EOT
}
