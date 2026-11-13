module "vpc" {
  source  = "./modules/VPC"
  context = local.context

  public_subnet_count       = var.vpc_public_subnet_count
  private_subnet_count      = var.vpc_private_subnet_count
  isolated_subnet_count     = var.vpc_isolated_subnet_count
  public_subnet_cidr_blocks = var.vpc_public_subnet_cidr_blocks

  enable_dns_support   = var.vpc_enable_dns_support
  enable_dns_hostnames = var.vpc_enable_dns_hostnames

  tags = var.vpc_tags
}

resource "aws_security_group" "example1" {
  name   = "bastion_sg"
  vpc_id = module.vpc.vpc_ids[0]

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${trimspace(data.http.my_public_ip.response_body)}/32"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "example" {
  name   = "nodes_sg"
  vpc_id = module.vpc.vpc_ids[0]

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.example1.id]
  }

  ingress {
    from_port = 6443
    to_port   = 6443
    protocol  = "tcp"
    self      = true
  }

  ingress {
    from_port = 10250
    to_port   = 10250
    protocol  = "tcp"
    self      = true
  }

  ingress {
    from_port = 8472
    to_port   = 8472
    protocol  = "udp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "bastian_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.micro"
  key_name                    = var.ec2_key_name
  associate_public_ip_address = true

  vpc_security_group_ids = [aws_security_group.example1.id]
  subnet_id              = module.vpc.public_subnet_ids[0]
  private_ip                  = "10.0.1.4"

  tags = {
    Name = "bastian_server"
  }
}

resource "aws_instance" "master_node" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.small"
  key_name                    = var.ec2_key_name
  associate_public_ip_address = true

  vpc_security_group_ids = [aws_security_group.example.id]
  subnet_id              = module.vpc.public_subnet_ids[0]
  private_ip                  = "10.0.1.5"

  tags = {
    Name = "master_node"
  }
}

resource "aws_instance" "worker_node_1" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.small"
  key_name                    = var.ec2_key_name
  associate_public_ip_address = true
  
  vpc_security_group_ids = [aws_security_group.example.id]
  subnet_id              = module.vpc.public_subnet_ids[0]
  private_ip                  = "10.0.1.6"

  tags = {
    Name = "worker_node_1"
  }
}

resource "aws_instance" "worker_node_2" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.small"
  key_name                    = var.ec2_key_name
  associate_public_ip_address = true

  vpc_security_group_ids = [aws_security_group.example.id]
  subnet_id              = module.vpc.public_subnet_ids[1]
  private_ip             = "10.0.2.4"

  tags = {
    Name = "worker_node_2"
  }
}