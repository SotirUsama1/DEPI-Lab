module "vpc" {
  source  = "../../../Grad/tf/AWS-Terraform-modules-registry-for-resources-provisioning/modules/VPC"
  context = local.context

  public_subnet_count   = var.vpc_public_subnet_count
  private_subnet_count  = var.vpc_private_subnet_count
  isolated_subnet_count = var.vpc_isolated_subnet_count

  enable_dns_support   = var.vpc_enable_dns_support
  enable_dns_hostnames = var.vpc_enable_dns_hostnames

  tags = var.vpc_tags
}

resource "aws_security_group" "example" {
  name   = format("%s-sg", var.namespace)
  vpc_id = module.vpc.vpc_ids[0]

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${trimspace(data.http.my_public_ip.response_body)}/32"]
  }

  ingress {
    from_port   = 5000
    to_port     = 5000
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

resource "aws_instance" "example" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.micro"
  key_name                    = "aws-default"
  associate_public_ip_address = true

  vpc_security_group_ids = [aws_security_group.example.id]
  subnet_id              = module.vpc.public_subnet_ids[0]

  tags = {
    Name = format("%s-instance-1", local.context.namespace)
  }
}