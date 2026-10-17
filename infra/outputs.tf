output "vpc_ids" {
  description = "The IDs of the VPCs"
  value       = module.vpc.vpc_ids
}

output "public_subnet_ids" {
  description = "The IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "instance-1_public_ip" {
  description = "The Elastic IP associated with the EC2 instance"
  value       = aws_instance.example.public_ip
}

output "instance-1_private_ip" {
  value = aws_instance.example.private_ip
}

output "instance_id" {
  description = "The created instance id"
  value       = aws_instance.example.id
}