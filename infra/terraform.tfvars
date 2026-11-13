# Provider configuration
aws_region  = "eu-west-3" # Paris
aws_profile = "aws-sotir"

# Global Context variables (To avoid issues, only lowercase alphanumeric characters and hyphens allowed)
owner_name   = "sotir"
org_name     = "depi"
project_name = "k8s-lab"
env_name     = ""

vpc_count                = 1
vpc_public_subnet_count  = 2
vpc_private_subnet_count = 0
vpc_public_subnet_cidr_blocks = ["10.0.1.0/24", "10.0.2.0/24"]

vpc_enable_dns_support   = true
vpc_enable_dns_hostnames = true

ec2_key_name = "aws-default"