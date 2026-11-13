output "vpc_ids" {
  description = "The IDs of the VPCs"
  value       = module.vpc.vpc_ids
}

output "public_subnet_ids" {
  description = "The IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "bastian_server_public_ip" {
  description = "The Elastic IP associated with the EC2 instance"
  value       = aws_instance.bastian_server.public_ip
}

output "bastian_server_private_ip" {
  value = aws_instance.bastian_server.private_ip
}

output "bastian_server_id" {
  description = "The created instance id"
  value       = aws_instance.bastian_server.id
}
/*
output "master_node_public_ip" {
  description = "The Elastic IP associated with the EC2 instance"
  value       = aws_instance.master_node.public_ip
}
*/
output "master_node_private_ip" {
  value = aws_instance.master_node.private_ip
}

output "master_node_id" {
  description = "The created instance id"
  value       = aws_instance.master_node.id
}
/*
output "worker_node_1_public_ip" {
  description = "The Elastic IP associated with the EC2 instance"
  value       = aws_instance.worker_node_1.public_ip
}
*/
output "worker_node_1_private_ip" {
  value = aws_instance.worker_node_1.private_ip
}

output "worker_node_1_id" {
  description = "The created instance id"
  value       = aws_instance.worker_node_1.id
}
/*
output "worker_node_2_public_ip" {
  description = "The Elastic IP associated with the EC2 instance"
  value       = aws_instance.worker_node_2.public_ip
}
*/
output "worker_node_2_private_ip" {
  value = aws_instance.worker_node_2.private_ip
}

output "worker_node_2_id" {
  description = "The created instance id"
  value       = aws_instance.worker_node_2.id
}